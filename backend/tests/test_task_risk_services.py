"""Task, risk, dashboard, and deterministic change-workflow coverage."""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
from collections.abc import Iterator
from datetime import date, datetime
from pathlib import Path

import httpx
import pytest
from sqlalchemy import inspect, text
from sqlalchemy import create_engine, func, select
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes import get_event_dashboard
from app import database as database_module
from app.database import get_db
from app.main import app
from app.models import Change, Event, Risk, Session as EventSession, Task, Venue, Volunteer
from app.schemas import RiskCreate, RiskUpdate, TaskCreate, TaskUpdate
from app.services.impact_service import process_change, reconstruct_verified_impact
from app.services.risk_service import (
    RiskOwnershipError,
    RiskReferenceNotFound,
    create_risk,
    ensure_conflict_risks,
    get_risk,
    list_risks_for_change,
    update_risk,
)
from app.services.task_service import (
    TaskOwnershipError,
    TaskReferenceNotFound,
    create_task,
    generate_follow_up_tasks,
    get_task,
    list_tasks_for_change,
    list_volunteer_tasks,
    update_task,
)

BACKEND_DIR = Path(__file__).resolve().parents[1]
EVENT_ID = "event_kbc_techfest_2026"
VENUE_A_ID = "venue_auditorium_a"


@pytest.fixture(scope="module")
def seed_database_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    seed_dir = tmp_path_factory.mktemp("phase6-seed")
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///./event.db"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "seed.py")],
        cwd=seed_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    return seed_dir / "event.db"


@pytest.fixture
def seeded_db(seed_database_path: Path, tmp_path: Path) -> Iterator[Session]:
    database_path = tmp_path / "event.db"
    shutil.copyfile(seed_database_path, database_path)
    engine = create_engine(
        URL.create("sqlite", database=str(database_path)),
        connect_args={"check_same_thread": False},
    )
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    yield db
    db.close()
    engine.dispose()


def add_other_event(db: Session) -> None:
    other = Event(
        id="event_other",
        name="Other Event",
        description="Ownership validation event",
        date=date(2026, 12, 1),
        start_time=datetime(2026, 12, 1, 9),
        end_time=datetime(2026, 12, 1, 17),
        status="planned",
    )
    venue = Venue(
        id="venue_other", event_id=other.id, name="Other Venue", location="Elsewhere",
        capacity=100, status="available",
    )
    volunteer = Volunteer(
        id="volunteer_other", event_id=other.id, name="Other Volunteer",
        email="other-volunteer@example.org", role="Coordinator", availability="available",
    )
    other_session = EventSession(
        id="session_other", event_id=other.id, venue_id=venue.id,
        title="Other event session", description="Ownership fixture.",
        start_time=datetime(2026, 12, 1, 10), end_time=datetime(2026, 12, 1, 11),
        status="scheduled",
    )
    db.add_all([other, venue, volunteer, other_session])
    db.commit()


def test_task_create_update_assignment_status_and_priority(seeded_db: Session) -> None:
    task = create_task(
        seeded_db,
        EVENT_ID,
        TaskCreate(
            title="Coordinate room updates",
            description="Notify the assigned team about the room update.",
            due_time=datetime(2026, 11, 14, 12),
            session_id="session_01",
            venue_id=VENUE_A_ID,
        ),
    )
    assert task.id.startswith("task_")

    updated = update_task(
        seeded_db,
        task.id,
        TaskUpdate(
            assigned_volunteer_id="volunteer_01",
            status="in_progress",
            priority="critical",
        ),
    )
    assert get_task(seeded_db, task.id).assigned_volunteer.id == "volunteer_01"
    assert updated.status == "in_progress"
    assert updated.priority == "critical"
    assert task in list_volunteer_tasks(seeded_db, "volunteer_01")


def test_task_assignment_and_related_entities_must_belong_to_event(seeded_db: Session) -> None:
    add_other_event(seeded_db)
    request = TaskCreate(
        title="Cross-event task", description="Must be rejected.",
        due_time=datetime(2026, 11, 14, 12), assigned_volunteer_id="volunteer_other",
    )
    with pytest.raises(TaskOwnershipError):
        create_task(seeded_db, EVENT_ID, request)
    with pytest.raises(TaskReferenceNotFound):
        create_task(
            seeded_db, EVENT_ID,
            TaskCreate(
                title="Missing volunteer", description="Must be rejected.",
                due_time=datetime(2026, 11, 14, 12), assigned_volunteer_id="missing",
            ),
        )
    with pytest.raises(TaskOwnershipError):
        create_task(
            seeded_db, EVENT_ID,
            TaskCreate(
                title="Cross-event session", description="Must be rejected.",
                due_time=datetime(2026, 11, 14, 12), session_id="session_other",
            ),
        )


def test_follow_up_generation_is_fact_based_and_deduplicated(seeded_db: Session) -> None:
    verified = process_change(
        seeded_db,
        event_id=EVENT_ID,
        entity_type="venue",
        entity_id=VENUE_A_ID,
        field_name="name",
        new_value="Auditorium B",
        reason="Auditorium A equipment issue",
    )
    first = generate_follow_up_tasks(seeded_db, verified)
    task_count = seeded_db.scalar(select(func.count()).select_from(Task))
    second = generate_follow_up_tasks(seeded_db, verified)
    assert len(first) == 6
    assert {task.id for task in first} == {task.id for task in second}
    assert seeded_db.scalar(select(func.count()).select_from(Task)) == task_count
    assert {task.title for task in first} == {
        "Review affected session schedules", "Confirm speaker updates",
        "Review volunteer assignments", "Verify affected equipment assignments",
        "Review related operational tasks", "Review related recorded risks",
    }
    assert all(task.venue_id == VENUE_A_ID for task in first)


def test_conflicts_create_deterministic_deduplicated_risks(seeded_db: Session) -> None:
    verified = process_change(
        seeded_db,
        event_id=EVENT_ID,
        entity_type="session",
        entity_id="session_06",
        field_name="venue_id",
        new_value="venue_auditorium_b",
        reason="Move session to the larger room.",
    )
    assert {conflict.type for conflict in verified.conflicts} >= {
        "venue_schedule_overlap", "speaker_overlap"
    }
    change = seeded_db.get(Change, verified.change_id)
    reconstructed = reconstruct_verified_impact(seeded_db, change)
    related_tasks = list_tasks_for_change(seeded_db, reconstructed)
    related_risks = list_risks_for_change(seeded_db, reconstructed)
    assert any(task.title == "Review changed session schedule" for task in related_tasks)
    assert any(risk.title == "Confirmed venue schedule overlap" for risk in related_risks)
    first = ensure_conflict_risks(seeded_db, verified)
    seeded_db.commit()
    dashboard = get_event_dashboard(EVENT_ID, seeded_db)
    assert "venue_schedule_overlap" in {item.type for item in dashboard.active_conflicts}
    all_generated = list(
        seeded_db.scalars(
            select(Risk).where(Risk.event_id == EVENT_ID, Risk.title.like("Confirmed %"))
        ).all()
    )
    before = {risk.id for risk in all_generated}
    again = ensure_conflict_risks(seeded_db, verified)
    seeded_db.commit()
    after = {
        risk.id
        for risk in seeded_db.scalars(
            select(Risk).where(Risk.event_id == EVENT_ID, Risk.title.like("Confirmed %"))
        ).all()
    }
    assert first
    assert {risk.id for risk in again} <= before
    assert after == before
    assert all(risk.severity in {"high", "medium"} for risk in all_generated)
    assert len({(risk.title, risk.session_id or risk.venue_id) for risk in all_generated}) == len(all_generated)


def test_risk_create_update_status_and_cross_event_validation(seeded_db: Session) -> None:
    risk = create_risk(
        seeded_db,
        EVENT_ID,
        RiskCreate(
            title="Venue access review", description="Confirm accessible entrance.",
            severity="medium", session_id="session_01", venue_id=VENUE_A_ID,
        ),
    )
    updated = update_risk(
        seeded_db, risk.id, RiskUpdate(status="monitoring", severity="high")
    )
    assert get_risk(seeded_db, risk.id).status == "monitoring"
    assert updated.severity == "high"

    add_other_event(seeded_db)
    with pytest.raises(RiskOwnershipError):
        create_risk(
            seeded_db, EVENT_ID,
            RiskCreate(
                title="Cross-event risk", description="Must be rejected.", severity="low",
                venue_id="venue_other",
            ),
        )
    with pytest.raises(RiskReferenceNotFound):
        create_risk(
            seeded_db, EVENT_ID,
            RiskCreate(
                title="Missing session", description="Must be rejected.", severity="low",
                session_id="missing",
            ),
        )


def test_change_related_tasks_and_risks_include_workflow_records(seeded_db: Session) -> None:
    created = process_change(
        seeded_db,
        event_id=EVENT_ID,
        entity_type="venue",
        entity_id=VENUE_A_ID,
        field_name="name",
        new_value="Auditorium B",
        reason="Equipment issue",
    )
    change = seeded_db.get(Change, created.change_id)
    verified = reconstruct_verified_impact(seeded_db, change)
    tasks = list_tasks_for_change(seeded_db, verified)
    risks = list_risks_for_change(seeded_db, verified)
    assert len([task for task in tasks if task.title == "Review affected session schedules"]) == 1
    assert {risk.id for risk in risks} >= {item.id for item in verified.affected.risks}


def test_dashboard_uses_current_database_values(seeded_db: Session) -> None:
    process_change(
        seeded_db,
        event_id=EVENT_ID,
        entity_type="venue",
        entity_id=VENUE_A_ID,
        field_name="name",
        new_value="Auditorium B",
        reason="Equipment issue",
    )
    dashboard = get_event_dashboard(EVENT_ID, seeded_db)
    assert dashboard.sessions.total == 11
    assert dashboard.tasks.total == 23
    assert dashboard.tasks.todo == 20
    assert dashboard.tasks.in_progress == 3
    assert dashboard.risks.total == 5
    assert dashboard.risks.open == 3


def test_startup_adds_change_links_to_existing_sqlite_tables(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    old_engine = create_engine(URL.create("sqlite", database=str(tmp_path / "legacy.db")))
    with old_engine.begin() as connection:
        connection.execute(text("CREATE TABLE events (id VARCHAR(64) PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE changes (id VARCHAR(64) PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE tasks (id VARCHAR(64) PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE risks (id VARCHAR(64) PRIMARY KEY)"))
    monkeypatch.setattr(database_module, "engine", old_engine)

    database_module.initialize_database()

    for table_name in ("tasks", "risks"):
        assert "source_change_id" in {
            column["name"] for column in inspect(old_engine).get_columns(table_name)
        }
        assert f"ix_{table_name}_source_change_id" in {
            index["name"] for index in inspect(old_engine).get_indexes(table_name)
        }
    old_engine.dispose()


def test_task_and_risk_api_validation_and_dashboard(seeded_db: Session) -> None:
    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    add_other_event(seeded_db)
    app.dependency_overrides[get_db] = override_get_db

    async def requests() -> list[httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            task_payload = {
                "title": "API-created task", "description": "Exercise task APIs.",
                "due_time": "2026-11-14T12:00:00", "session_id": "session_01",
                "venue_id": VENUE_A_ID,
            }
            task = await client.post(f"/events/{EVENT_ID}/tasks", json=task_payload)
            task_id = task.json()["id"]
            update = await client.patch(
                f"/tasks/{task_id}", json={"assigned_volunteer_id": "volunteer_01", "status": "blocked", "priority": "critical"}
            )
            invalid_owner = await client.patch(
                f"/tasks/{task_id}", json={"assigned_volunteer_id": "volunteer_other"}
            )
            invalid_status = await client.patch(f"/tasks/{task_id}", json={"status": "imaginary"})
            task_read = await client.get(f"/tasks/{task_id}")
            volunteer_tasks = await client.get("/volunteers/volunteer_01/tasks")
            risk = await client.post(
                f"/events/{EVENT_ID}/risks",
                json={"title":"API risk", "description":"Exercise risk APIs.", "severity":"medium", "session_id":"session_01"},
            )
            risk_update = await client.patch(f"/risks/{risk.json()['id']}", json={"status":"mitigated"})
            risk_read = await client.get(f"/risks/{risk.json()['id']}")
            event_tasks = await client.get(f"/events/{EVENT_ID}/tasks")
            event_risks = await client.get(f"/events/{EVENT_ID}/risks")
            dashboard = await client.get(f"/events/{EVENT_ID}/dashboard")
            return [task, update, invalid_owner, invalid_status, task_read, volunteer_tasks, risk, risk_update, risk_read, event_tasks, event_risks, dashboard]

    try:
        from unittest.mock import patch

        with patch("app.main.initialize_database", lambda: None):
            responses = asyncio.run(requests())
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert [responses[index].status_code for index in (0, 1, 4, 5, 6, 7, 8, 9, 10, 11)] == [201, 200, 200, 200, 201, 200, 200, 200, 200, 200]
    assert responses[1].json()["status"] == "blocked"
    assert responses[1].json()["priority"] == "critical"
    assert responses[2].status_code == 422
    assert responses[3].status_code == 422
    assert responses[4].json()["session"]["title"] == "Opening Ceremony"
    assert len(responses[5].json()) >= 1
    assert responses[7].json()["status"] == "mitigated"
    assert responses[11].json()["sessions"]["total"] == 11
