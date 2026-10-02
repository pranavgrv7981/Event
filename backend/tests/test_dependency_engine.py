"""Dependency-engine tests against the production seed and ORM schema."""

from __future__ import annotations

import os
import subprocess
import sys
import asyncio
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import patch

import pytest
import httpx
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_db
from app.main import app
from app.models import Equipment, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import AffectedEntities
from app.services.dependency_engine import (
    EntityNotFound,
    InvalidEntityIdentifier,
    UnsupportedEntityType,
    get_affected_entities,
)

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
def seeded_db(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Session]:
    database_dir = tmp_path_factory.mktemp("seeded-event")
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///./event.db"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "seed.py")],
        cwd=database_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    test_engine = create_engine(
        URL.create("sqlite", database=str(database_dir / "event.db")),
        connect_args={"check_same_thread": False},
    )
    test_session_factory = sessionmaker(bind=test_engine, expire_on_commit=False)
    db = test_session_factory()
    yield db
    db.close()
    test_engine.dispose()


def entity_ids(result, key: str) -> list[str]:
    return [entity.id for entity in getattr(result.affected, key)]


def related_ids(entities) -> set[str]:
    return {entity.id for entity in entities}


def test_venue_discovers_sessions_speakers_volunteers_equipment_tasks(seeded_db: Session) -> None:
    venue = seeded_db.get(Venue, "venue_auditorium_a")
    result = get_affected_entities(seeded_db, "venue", venue.id)
    sessions = venue.sessions

    assert set(entity_ids(result, "sessions")) == related_ids(sessions)
    assert set(entity_ids(result, "speakers")) == related_ids(
        speaker for session in sessions for speaker in session.speakers
    )
    assert set(entity_ids(result, "volunteers")) == related_ids(
        volunteer for session in sessions for volunteer in session.volunteers
    )
    assert set(entity_ids(result, "equipment")) == related_ids(
        equipment for session in sessions for equipment in session.equipment
    )
    assert set(entity_ids(result, "tasks")) == related_ids(
        [*venue.tasks, *(task for session in sessions for task in session.tasks)]
    )


def test_auditorium_a_integration_uses_actual_seed_relationships(seeded_db: Session) -> None:
    venue = seeded_db.get(Venue, "venue_auditorium_a")
    keynote = next(session for session in venue.sessions if session.title == "AI & Future of Computing")
    result = get_affected_entities(seeded_db, "venue", venue.id)

    assert keynote.id in entity_ids(result, "sessions")
    assert {speaker.id for speaker in keynote.speakers} <= set(entity_ids(result, "speakers"))
    assert {volunteer.id for volunteer in keynote.volunteers} <= set(entity_ids(result, "volunteers"))
    assert {equipment.id for equipment in keynote.equipment} <= set(entity_ids(result, "equipment"))
    assert {task.id for task in keynote.tasks} <= set(entity_ids(result, "tasks"))


def test_session_returns_its_direct_relationships(seeded_db: Session) -> None:
    session = seeded_db.get(EventSession, "session_02")
    result = get_affected_entities(seeded_db, "session", session.id)

    assert entity_ids(result, "venues") == [session.venue.id]
    assert set(entity_ids(result, "speakers")) == related_ids(session.speakers)
    assert set(entity_ids(result, "volunteers")) == related_ids(session.volunteers)
    assert set(entity_ids(result, "equipment")) == related_ids(session.equipment)
    assert set(entity_ids(result, "tasks")) == related_ids(session.tasks)


def test_speaker_returns_associated_sessions_and_session_context(seeded_db: Session) -> None:
    speaker = seeded_db.get(Speaker, "speaker_01")
    result = get_affected_entities(seeded_db, "speaker", speaker.id)

    assert set(entity_ids(result, "sessions")) == related_ids(speaker.sessions)
    assert speaker.id not in entity_ids(result, "speakers")
    assert set(entity_ids(result, "venues")) == related_ids(session.venue for session in speaker.sessions)


def test_volunteer_returns_assigned_tasks_and_related_sessions(seeded_db: Session) -> None:
    volunteer = seeded_db.get(Volunteer, "volunteer_06")
    result = get_affected_entities(seeded_db, "volunteer", volunteer.id)

    assert set(entity_ids(result, "tasks")) == related_ids(volunteer.tasks)
    assert set(entity_ids(result, "sessions")) == related_ids(volunteer.sessions)
    assert set(entity_ids(result, "venues")) == related_ids(
        session.venue for session in volunteer.sessions
    )


def test_equipment_returns_connected_sessions_venues_and_tasks(seeded_db: Session) -> None:
    equipment = seeded_db.get(Equipment, "equipment_01")
    result = get_affected_entities(seeded_db, "equipment", equipment.id)
    expected_tasks = set(equipment.venue.tasks)
    for session in equipment.sessions:
        expected_tasks.update(session.tasks)

    assert set(entity_ids(result, "sessions")) == related_ids(equipment.sessions)
    assert equipment.venue.id in entity_ids(result, "venues")
    assert set(entity_ids(result, "tasks")) == related_ids(expected_tasks)


def test_task_returns_its_direct_entities(seeded_db: Session) -> None:
    task = seeded_db.get(Task, "task_01")
    result = get_affected_entities(seeded_db, "task", task.id)

    assert entity_ids(result, "events") == [task.event.id]
    assert entity_ids(result, "sessions") == [task.session.id]
    assert entity_ids(result, "venues") == [task.venue.id]
    assert entity_ids(result, "volunteers") == [task.assigned_volunteer.id]


def test_risk_returns_its_direct_entities(seeded_db: Session) -> None:
    risk = seeded_db.get(Risk, "risk_01")
    result = get_affected_entities(seeded_db, "risk", risk.id)

    assert entity_ids(result, "events") == [risk.event.id]
    assert entity_ids(result, "venues") == [risk.venue.id]
    assert entity_ids(result, "sessions") == [risk.session.id]


def test_event_returns_directly_related_collections(seeded_db: Session) -> None:
    event = seeded_db.get(Event, "event_kbc_techfest_2026")
    result = get_affected_entities(seeded_db, "event", event.id)

    for key, relationship in (
        ("venues", event.venues),
        ("sessions", event.sessions),
        ("speakers", event.speakers),
        ("volunteers", event.volunteers),
        ("equipment", event.equipment),
        ("tasks", event.tasks),
        ("risks", event.risks),
    ):
        assert set(entity_ids(result, key)) == related_ids(relationship)


def test_results_have_no_duplicates(seeded_db: Session) -> None:
    result = get_affected_entities(seeded_db, "venue", "venue_auditorium_a")

    for key in AffectedEntities.model_fields:
        ids = entity_ids(result, key)
        assert len(ids) == len(set(ids))


def test_same_input_returns_deterministic_sorted_result(seeded_db: Session) -> None:
    first = get_affected_entities(seeded_db, "venue", "venue_auditorium_a")
    second = get_affected_entities(seeded_db, "venue", "venue_auditorium_a")

    assert first.model_dump() == second.model_dump()
    for key in AffectedEntities.model_fields:
        assert entity_ids(first, key) == sorted(entity_ids(first, key))


def test_unsupported_entity_type_is_rejected(seeded_db: Session) -> None:
    with pytest.raises(UnsupportedEntityType):
        get_affected_entities(seeded_db, "change", "change_01")


def test_missing_entity_is_reported(seeded_db: Session) -> None:
    with pytest.raises(EntityNotFound):
        get_affected_entities(seeded_db, "venue", "missing-venue")


@pytest.mark.parametrize("entity_id", ["", " padded ", "x" * 65])
def test_invalid_entity_identifier_is_rejected(seeded_db: Session, entity_id: str) -> None:
    with pytest.raises(InvalidEntityIdentifier):
        get_affected_entities(seeded_db, "venue", entity_id)


def test_dependency_api_success_and_error_statuses(seeded_db: Session) -> None:
    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    app.dependency_overrides[get_db] = override_get_db
    async def make_requests() -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get("/dependencies/venue/venue_auditorium_a")
            assert response.status_code == 200
            assert response.json()["source"] == {
                "entity_type": "venue",
                "entity_id": "venue_auditorium_a",
            }
            assert response.json()["affected"]["sessions"]
            assert (await client.get("/dependencies/change/change_01")).status_code == 422
            assert (await client.get("/dependencies/venue/not-found")).status_code == 404
            assert (await client.get("/dependencies/venue/%20")).status_code == 422

    try:
        with patch("app.main.initialize_database", lambda: None):
            asyncio.run(make_requests())
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_dependency_api_hides_database_error_details(seeded_db: Session) -> None:
    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    app.dependency_overrides[get_db] = override_get_db

    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.get("/dependencies/venue/venue_auditorium_a")

    try:
        with (
            patch("app.main.initialize_database", lambda: None),
            patch(
                "app.api.routes.get_affected_entities",
                side_effect=SQLAlchemyError("sensitive database detail"),
            ),
        ):
            response = asyncio.run(make_request())
        assert response.status_code == 500
        assert response.json() == {"detail": "Dependency lookup failed"}
        assert "sensitive database detail" not in response.text
    finally:
        app.dependency_overrides.pop(get_db, None)
