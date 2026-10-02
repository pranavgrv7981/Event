"""Transactional impact tests using an isolated copy of the real event seed."""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
from collections.abc import Iterator
from datetime import date, datetime
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_db
from app.main import app
from app.models import Change, Event, Session as EventSession, Venue
from app.schemas import AffectedEntities
from app.services.dependency_engine import EntityNotFound, get_affected_entities
from app.services.impact_service import (
    EntityOwnershipError,
    EventNotFound,
    InvalidChangeValue,
    UnchangedValue,
    UnsupportedChangeField,
    process_change,
)

BACKEND_DIR = Path(__file__).resolve().parents[1]
EVENT_ID = "event_kbc_techfest_2026"
VENUE_A_ID = "venue_auditorium_a"


@pytest.fixture(scope="module")
def seed_database_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    seed_dir = tmp_path_factory.mktemp("phase4-seed")
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
def seeded_db(
    seed_database_path: Path, tmp_path: Path
) -> Iterator[Session]:
    test_database = tmp_path / "event.db"
    shutil.copyfile(seed_database_path, test_database)
    test_engine = create_engine(
        URL.create("sqlite", database=str(test_database)),
        connect_args={"check_same_thread": False},
    )
    factory = sessionmaker(bind=test_engine, expire_on_commit=False)
    db = factory()
    yield db
    db.close()
    test_engine.dispose()


def process_venue_rename(db: Session, new_value: str = "Auditorium B"):
    return process_change(
        db,
        event_id=EVENT_ID,
        entity_type="venue",
        entity_id=VENUE_A_ID,
        field_name="name",
        new_value=new_value,
        reason="Auditorium A equipment issue",
    )


def test_valid_venue_change_updates_record_and_creates_change(seeded_db: Session) -> None:
    result = process_venue_rename(seeded_db)

    assert result.change.entity_type == "venue"
    assert result.change.entity_id == VENUE_A_ID
    assert result.change.field_name == "name"
    assert result.change.old_value == "Auditorium A"
    assert result.change.new_value == "Auditorium B"
    assert result.change.reason == "Auditorium A equipment issue"
    assert seeded_db.get(Venue, VENUE_A_ID).name == "Auditorium B"
    assert seeded_db.get(Change, result.change_id) is not None


def test_venue_change_returns_seeded_affected_entity_sets(seeded_db: Session) -> None:
    expected = get_affected_entities(seeded_db, "venue", VENUE_A_ID)
    expected_dump = expected.affected.model_dump()
    seeded_db.rollback()

    result = process_venue_rename(seeded_db)

    assert result.affected.model_dump() == expected_dump
    assert result.impact.counts.sessions == len(expected_dump["sessions"])
    assert result.impact.counts.speakers == len(expected_dump["speakers"])
    assert result.impact.counts.volunteers == len(expected_dump["volunteers"])
    assert result.impact.counts.equipment == len(expected_dump["equipment"])
    assert result.impact.counts.tasks == len(expected_dump["tasks"])
    assert result.impact.counts.risks == len(expected_dump["risks"])
    assert result.verification.source == "database"
    assert result.verification.deterministic is True


def test_auditorium_a_to_b_integration_uses_actual_seeded_relationships(
    seeded_db: Session,
) -> None:
    venue = seeded_db.get(Venue, VENUE_A_ID)
    sessions = list(venue.sessions)
    expected = {
        "sessions": {session.id for session in sessions},
        "speakers": {item.id for session in sessions for item in session.speakers},
        "volunteers": {item.id for session in sessions for item in session.volunteers},
        "equipment": {item.id for session in sessions for item in session.equipment},
        "tasks": {item.id for item in venue.tasks}
        | {item.id for session in sessions for item in session.tasks},
        "risks": {item.id for item in venue.risks}
        | {item.id for session in sessions for item in session.risks},
    }
    keynote = next(session for session in sessions if session.title == "AI & Future of Computing")
    expected["speakers"].update(item.id for item in keynote.speakers)
    seeded_db.rollback()

    result = process_venue_rename(seeded_db)

    for entity_type, ids in expected.items():
        actual = {item.id for item in getattr(result.affected, entity_type)}
        assert actual == ids
    assert result.change.old_value == "Auditorium A"
    assert result.change.new_value == "Auditorium B"
    assert result.impact.severity == "medium"
    assert result.conflicts == []


def test_old_value_is_read_from_database_not_request(seeded_db: Session) -> None:
    result = process_venue_rename(seeded_db)
    assert result.change.old_value == "Auditorium A"


def test_invalid_target_entity_is_rejected_without_change(seeded_db: Session) -> None:
    with pytest.raises(EntityNotFound):
        process_change(
            seeded_db,
            event_id=EVENT_ID,
            entity_type="venue",
            entity_id="missing-venue",
            field_name="name",
            new_value="Somewhere Else",
            reason="test missing target",
        )
    assert seeded_db.scalar(select(func.count()).select_from(Change)) == 1


def test_invalid_event_is_rejected(seeded_db: Session) -> None:
    with pytest.raises(EventNotFound):
        process_change(
            seeded_db,
            event_id="missing-event",
            entity_type="venue",
            entity_id=VENUE_A_ID,
            field_name="name",
            new_value="Auditorium B",
            reason="test missing event",
        )


def test_unsupported_field_is_rejected(seeded_db: Session) -> None:
    with pytest.raises(UnsupportedChangeField):
        process_change(
            seeded_db,
            event_id=EVENT_ID,
            entity_type="venue",
            entity_id=VENUE_A_ID,
            field_name="id",
            new_value="replacement-id",
            reason="unsupported field test",
        )


def test_same_old_and_new_value_is_rejected(seeded_db: Session) -> None:
    with pytest.raises(UnchangedValue):
        process_venue_rename(seeded_db, "Auditorium A")


def test_invalid_destination_value_is_rejected(seeded_db: Session) -> None:
    with pytest.raises(InvalidChangeValue):
        process_change(
            seeded_db,
            event_id=EVENT_ID,
            entity_type="venue",
            entity_id=VENUE_A_ID,
            field_name="capacity",
            new_value=-20,
            reason="invalid capacity test",
        )


def test_target_must_belong_to_route_event(seeded_db: Session) -> None:
    other_event = Event(
        id="event_other",
        name="Other Event",
        description="Ownership validation fixture",
        date=date(2026, 12, 1),
        start_time=datetime(2026, 12, 1, 9),
        end_time=datetime(2026, 12, 1, 17),
        status="planned",
    )
    other_venue = Venue(
        id="venue_other",
        event=other_event,
        name="Other Venue",
        location="Elsewhere",
        capacity=100,
        status="available",
    )
    seeded_db.add(other_event)
    seeded_db.add(other_venue)
    seeded_db.commit()

    with pytest.raises(EntityOwnershipError):
        process_change(
            seeded_db,
            event_id=EVENT_ID,
            entity_type="venue",
            entity_id="venue_other",
            field_name="name",
            new_value="Unauthorized rename",
            reason="ownership test",
        )


def test_destination_relationship_must_belong_to_same_event(seeded_db: Session) -> None:
    other_event = Event(
        id="event_other",
        name="Other Event",
        description="Foreign key ownership fixture",
        date=date(2026, 12, 1),
        start_time=datetime(2026, 12, 1, 9),
        end_time=datetime(2026, 12, 1, 17),
        status="planned",
    )
    other_venue = Venue(
        id="venue_other",
        event=other_event,
        name="Other Venue",
        location="Elsewhere",
        capacity=100,
        status="available",
    )
    seeded_db.add_all([other_event, other_venue])
    seeded_db.commit()

    with pytest.raises(EntityOwnershipError):
        process_change(
            seeded_db,
            event_id=EVENT_ID,
            entity_type="session",
            entity_id="session_02",
            field_name="venue_id",
            new_value="venue_other",
            reason="cross-event move",
        )


def test_impact_failure_rolls_back_entity_and_change(seeded_db: Session) -> None:
    from app.services import impact_service

    before_count = seeded_db.scalar(select(func.count()).select_from(Change))
    seeded_db.rollback()
    with patch.object(impact_service, "analyze_impact", side_effect=RuntimeError("impact failure")):
        with pytest.raises(RuntimeError):
            process_venue_rename(seeded_db)

    assert seeded_db.get(Venue, VENUE_A_ID).name == "Auditorium A"
    assert seeded_db.scalar(select(func.count()).select_from(Change)) == before_count


def test_session_move_reports_supported_schedule_and_speaker_conflicts(
    seeded_db: Session,
) -> None:
    result = process_change(
        seeded_db,
        event_id=EVENT_ID,
        entity_type="session",
        entity_id="session_06",
        field_name="venue_id",
        new_value="venue_auditorium_b",
        reason="move workshop to larger auditorium",
    )

    conflict_types = {item.type for item in result.conflicts}
    assert "venue_schedule_overlap" in conflict_types
    assert "speaker_overlap" in conflict_types
    assert result.impact.conflict_count == len(result.conflicts)
    assert result.impact.severity == "high"


def test_session_move_reports_concurrent_volunteer_and_equipment_conflicts(
    seeded_db: Session,
) -> None:
    source_session = seeded_db.get(EventSession, "session_06")
    destination_session = seeded_db.get(EventSession, "session_05")
    destination_session.volunteers.append(source_session.volunteers[0])
    destination_session.equipment.append(source_session.equipment[0])
    shared_equipment = source_session.equipment[0]
    shared_equipment.quantity = 1
    seeded_db.commit()

    result = process_change(
        seeded_db,
        event_id=EVENT_ID,
        entity_type="session",
        entity_id=source_session.id,
        field_name="venue_id",
        new_value="venue_auditorium_b",
        reason="validate shared resource checks",
    )

    conflict_types = {item.type for item in result.conflicts}
    assert "volunteer_overlap" in conflict_types
    assert "equipment_conflict" in conflict_types


def test_change_history_and_single_change_api(seeded_db: Session) -> None:
    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    app.dependency_overrides[get_db] = override_get_db

    async def requests() -> tuple[httpx.Response, httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            created = await client.post(
                f"/events/{EVENT_ID}/changes",
                json={
                    "entity_type": "venue",
                    "entity_id": VENUE_A_ID,
                    "field_name": "name",
                    "new_value": "Auditorium B",
                    "reason": "Auditorium A equipment issue",
                },
            )
            history = await client.get(f"/events/{EVENT_ID}/changes")
            individual = await client.get(f"/changes/{created.json()['change_id']}")
            return created, history, individual

    try:
        with patch("app.main.initialize_database", lambda: None):
            created, history, individual = asyncio.run(requests())
        assert created.status_code == 201
        assert created.json()["change"]["old_value"] == "Auditorium A"
        assert created.json()["change"]["new_value"] == "Auditorium B"
        assert created.json()["impact"]["counts"]["sessions"] == 3
        assert created.json()["impact"]["counts"]["tasks"] == 6
        assert created.json()["conflicts"] == []
        assert history.status_code == 200 and len(history.json()) == 2
        assert history.json()[0]["id"] == created.json()["change_id"]
        assert individual.status_code == 200
        assert individual.json()["id"] == created.json()["change_id"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_change_api_validation_statuses(seeded_db: Session) -> None:
    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    app.dependency_overrides[get_db] = override_get_db

    async def requests() -> list[httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            payload = {
                "entity_type": "venue",
                "entity_id": VENUE_A_ID,
                "field_name": "name",
                "new_value": "Auditorium B",
                "reason": "API validation",
            }
            invalid_field = {**payload, "field_name": "created_at"}
            no_op = {**payload, "new_value": "Auditorium A"}
            return [
                await client.post("/events/missing-event/changes", json=payload),
                await client.post(f"/events/{EVENT_ID}/changes", json={**payload, "entity_id": "missing"}),
                await client.post(f"/events/{EVENT_ID}/changes", json=invalid_field),
                await client.post(f"/events/{EVENT_ID}/changes", json=no_op),
                await client.post(f"/events/{EVENT_ID}/changes", json={**payload, "new_value": -1}),
                await client.post(f"/events/{EVENT_ID}/changes", json={**payload, "reason": "   "}),
                await client.post(f"/events/{EVENT_ID}/changes", json={**payload, "extra": True}),
            ]

    try:
        with patch("app.main.initialize_database", lambda: None):
            responses = asyncio.run(requests())
        assert [response.status_code for response in responses] == [404, 404, 422, 422, 422, 422, 422]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_database_error_returns_generic_api_response(seeded_db: Session) -> None:
    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    app.dependency_overrides[get_db] = override_get_db

    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(
                f"/events/{EVENT_ID}/changes",
                json={
                    "entity_type": "venue",
                    "entity_id": VENUE_A_ID,
                    "field_name": "name",
                    "new_value": "Auditorium B",
                    "reason": "database failure test",
                },
            )

    try:
        with (
            patch("app.main.initialize_database", lambda: None),
            patch("app.api.routes.process_change", side_effect=SQLAlchemyError("private details")),
        ):
            response = asyncio.run(make_request())
        assert response.status_code == 500
        assert response.json() == {"detail": "Change processing failed"}
        assert "private details" not in response.text
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_impact_result_is_deterministic_across_identical_seed_copies(
    seed_database_path: Path, tmp_path: Path
) -> None:
    results = []
    for index in range(2):
        database_path = tmp_path / f"copy-{index}" / "event.db"
        database_path.parent.mkdir()
        shutil.copyfile(seed_database_path, database_path)
        engine = create_engine(URL.create("sqlite", database=str(database_path)))
        db = sessionmaker(bind=engine, expire_on_commit=False)()
        result = process_venue_rename(db)
        results.append(
            {
                "affected": result.affected.model_dump(),
                "conflicts": [item.model_dump() for item in result.conflicts],
                "impact": result.impact.model_dump(),
            }
        )
        db.close()
        engine.dispose()
    assert results[0] == results[1]


def test_change_impact_has_no_duplicate_affected_entities(seeded_db: Session) -> None:
    result = process_venue_rename(seeded_db)
    for field_name in AffectedEntities.model_fields:
        ids = [item.id for item in getattr(result.affected, field_name)]
        assert len(ids) == len(set(ids))
