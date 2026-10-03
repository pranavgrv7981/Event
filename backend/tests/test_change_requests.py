"""Change request API tests against an isolated seeded database."""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from sqlalchemy import create_engine, func, select, update
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_db
from app.main import app
from app.models import (
    Change,
    ChangeRequest as ChangeRequestModel,
    Risk,
    Session as EventSession,
    Task,
)

BACKEND_DIR = Path(__file__).resolve().parents[1]
EVENT_ID = "event_kbc_techfest_2026"
SESSION_ID = "session_01"


@pytest.fixture(scope="module")
def seed_database_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    seed_dir = tmp_path_factory.mktemp("change-request-seed")
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///./event.db"
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
def api_context(seed_database_path: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[Session, httpx.AsyncClient]]:
    test_database = tmp_path / "event.db"
    shutil.copyfile(seed_database_path, test_database)
    engine = create_engine(
        URL.create("sqlite", database=str(test_database)),
        connect_args={"check_same_thread": False},
    )
    db = sessionmaker(bind=engine, expire_on_commit=False)()

    from app.integrations.notion.sync import NotionSyncResult
    import app.api.routes as routes

    monkeypatch.setattr(
        routes,
        "sync_change_to_notion",
        lambda _db, change, _verified, **_kwargs: NotionSyncResult(
            change_id=change.id,
            success=False,
            failures=[{
                "record_type": "configuration",
                "error": "Notion unavailable in isolated test",
                "category": "configuration",
            }],
        ),
    )
    monkeypatch.setattr(
        routes,
        "sync_change_request_to_notion",
        lambda request: NotionSyncResult(
            change_id=request.id,
            success=False,
            failures=[{
                "record_type": "configuration",
                "error": "Notion unavailable in isolated test",
                "category": "configuration",
            }],
        ),
    )

    def override_get_db() -> Iterator[Session]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    client = httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    )
    yield db, client
    asyncio.run(client.aclose())
    app.dependency_overrides.pop(get_db, None)
    db.close()
    engine.dispose()


def payload(**overrides: object) -> dict[str, object]:
    return {
        "entity_type": "session",
        "entity_id": SESSION_ID,
        "field_name": "venue_id",
        "new_value": "venue_auditorium_b",
        "reason": "Request venue relocation for approval",
        "created_by": "operations@example.org",
        **overrides,
    }


def test_create_change_request_is_pending_and_does_not_apply(api_context) -> None:
    db, client = api_context
    original_venue_id = db.get(EventSession, SESSION_ID).venue_id

    response = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["old_value"] == original_venue_id
    assert body["new_value"] == "venue_auditorium_b"
    assert body["created_by"] == "operations@example.org"
    assert db.get(EventSession, SESSION_ID).venue_id == original_venue_id
    assert db.get(ChangeRequestModel, body["id"]).status == "PENDING"


def test_list_change_requests_filters_by_event_and_status(api_context) -> None:
    _, client = api_context
    first = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))
    second = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload(created_by="admin")))
    asyncio.run(client.post(f"/change-requests/{second.json()['id']}/accept"))

    pending = asyncio.run(client.get("/change-requests", params={"event_id": EVENT_ID, "status": "PENDING"}))
    applied = asyncio.run(client.get("/change-requests", params={"status": "APPLIED"}))
    single = asyncio.run(client.get(f"/change-requests/{first.json()['id']}"))

    assert pending.status_code == 200
    assert [item["id"] for item in pending.json()] == [first.json()["id"]]
    assert applied.status_code == 200
    assert [item["id"] for item in applied.json()] == [second.json()["id"]]
    assert single.status_code == 200
    assert single.json()["id"] == first.json()["id"]


def test_reject_pending_request_does_not_modify_target(api_context) -> None:
    db, client = api_context
    original_venue_id = db.get(EventSession, SESSION_ID).venue_id
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    rejected = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/reject"))

    assert rejected.status_code == 200
    assert rejected.json()["request"]["status"] == "REJECTED"
    assert db.get(EventSession, SESSION_ID).venue_id == original_venue_id


def test_review_returns_proposed_impact_and_ai_without_mutating_database(api_context) -> None:
    db, client = api_context
    entity_id = "session_06"
    original_venue_id = db.get(EventSession, entity_id).venue_id
    before = {
        "changes": db.scalar(select(func.count()).select_from(Change)),
        "tasks": db.scalar(select(func.count()).select_from(Task)),
        "risks": db.scalar(select(func.count()).select_from(Risk)),
    }
    created = asyncio.run(client.post(
        f"/events/{EVENT_ID}/change-requests",
        json=payload(entity_id=entity_id, reason="Review proposed venue move"),
    ))

    with patch("app.api.routes.process_change") as process_mock:
        response = asyncio.run(client.get(
            f"/change-requests/{created.json()['id']}/review"
        ))

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["is_preview"] is True
    assert body["request"]["status"] == "PENDING"
    assert body["preview"]["change"]["old_value"] == original_venue_id
    assert body["preview"]["change"]["new_value"] == "venue_auditorium_b"
    assert body["preview"]["verification"]["deterministic"] is True
    assert "venue_auditorium_b" in {
        item["id"] for item in body["preview"]["affected"]["venues"]
    }
    assert body["preview"]["conflicts"]
    assert body["ai_analysis"]["source"] == "verified_backend_impact"
    assert body["ai_analysis"]["verified_impact"]["change_id"] == body["preview"]["change_id"]
    assert body["possible_resolution"]
    assert db.get(ChangeRequestModel, created.json()["id"]).status == "PENDING"
    assert db.get(EventSession, entity_id).venue_id == original_venue_id
    assert db.scalar(select(func.count()).select_from(Change)) == before["changes"]
    assert db.scalar(select(func.count()).select_from(Task)) == before["tasks"]
    assert db.scalar(select(func.count()).select_from(Risk)) == before["risks"]
    process_mock.assert_not_called()


def test_review_is_available_only_while_request_is_pending(api_context) -> None:
    _, client = api_context
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))
    request_id = created.json()["id"]
    rejected = asyncio.run(client.post(f"/change-requests/{request_id}/reject"))

    response = asyncio.run(client.get(f"/change-requests/{request_id}/review"))

    assert rejected.status_code == 200
    assert response.status_code == 409


def test_rejection_syncs_to_notion_without_applying_change(api_context, monkeypatch) -> None:
    db, client = api_context
    import app.api.routes as routes
    from app.integrations.notion.sync import NotionSyncResult

    original_venue_id = db.get(EventSession, SESSION_ID).venue_id
    original_changes = db.scalar(select(func.count()).select_from(Change))
    captured = []

    def sync_spy(request):
        captured.append(request)
        return NotionSyncResult(
            change_id=request.id, success=True, change_synced=True, records_created=1
        )

    monkeypatch.setattr(routes, "sync_change_request_to_notion", sync_spy)
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    with patch("app.api.routes.process_change") as process_mock:
        response = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/reject"))

    assert response.status_code == 200
    body = response.json()
    assert body["request"]["status"] == "REJECTED"
    assert body["notion_sync"]["success"] is True
    assert body["notion_sync"]["change_synced"] is True
    assert len(captured) == 1
    assert captured[0].id == created.json()["id"]
    assert captured[0].old_value == original_venue_id
    assert captured[0].new_value == "venue_auditorium_b"
    assert captured[0].reason == "Request venue relocation for approval"
    assert captured[0].created_by == "operations@example.org"
    assert db.get(EventSession, SESSION_ID).venue_id == original_venue_id
    assert db.scalar(select(func.count()).select_from(Change)) == original_changes
    process_mock.assert_not_called()


def test_failed_rejection_notion_sync_keeps_request_rejected(api_context, monkeypatch) -> None:
    db, client = api_context
    import app.api.routes as routes
    from app.integrations.notion.sync import NotionSyncResult

    original_venue_id = db.get(EventSession, SESSION_ID).venue_id
    original_changes = db.scalar(select(func.count()).select_from(Change))
    monkeypatch.setattr(
        routes,
        "sync_change_request_to_notion",
        lambda request: NotionSyncResult(
            change_id=request.id,
            success=False,
            failures=[{
                "record_type": "changes",
                "record_id": request.id,
                "error": "Notion write failed",
                "category": "network",
            }],
        ),
    )
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    response = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/reject"))

    assert response.status_code == 200
    assert response.json()["request"]["status"] == "REJECTED"
    assert response.json()["notion_sync"]["success"] is False
    assert response.json()["notion_sync"]["failures"][0]["error"] == "Notion write failed"
    assert db.get(ChangeRequestModel, created.json()["id"]).status == "REJECTED"
    assert db.get(EventSession, SESSION_ID).venue_id == original_venue_id
    assert db.scalar(select(func.count()).select_from(Change)) == original_changes


def test_repeated_rejection_does_not_repeat_notion_or_change_execution(api_context, monkeypatch) -> None:
    _, client = api_context
    import app.api.routes as routes
    from app.integrations.notion.sync import NotionSyncResult

    sync_ids = []

    def sync_spy(request):
        sync_ids.append(request.id)
        return NotionSyncResult(change_id=request.id, success=True, change_synced=True)

    monkeypatch.setattr(routes, "sync_change_request_to_notion", sync_spy)
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))
    request_id = created.json()["id"]

    with patch("app.api.routes.process_change") as process_mock:
        first = asyncio.run(client.post(f"/change-requests/{request_id}/reject"))
        second = asyncio.run(client.post(f"/change-requests/{request_id}/reject"))

    assert first.status_code == 200
    assert first.json()["request"]["status"] == "REJECTED"
    assert second.status_code == 409
    assert sync_ids == [request_id]
    process_mock.assert_not_called()


def test_approval_executes_change_and_existing_impact_pipeline(api_context) -> None:
    db, client = api_context
    conflicted_session_id = "session_06"
    original_venue_id = db.get(EventSession, conflicted_session_id).venue_id
    request_payload = payload(
        entity_id=conflicted_session_id,
        reason="Move session to the larger auditorium for approval.",
    )
    created = asyncio.run(
        client.post(f"/events/{EVENT_ID}/change-requests", json=request_payload)
    )

    accepted = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/accept"))

    assert accepted.status_code == 200
    body = accepted.json()
    change_id = body["result"]["change_id"]
    assert body["request"]["status"] == "APPLIED"
    assert body["request"]["id"] == created.json()["id"]
    assert body["result"]["change"]["old_value"] == original_venue_id
    assert body["result"]["change"]["new_value"] == "venue_auditorium_b"
    assert body["result"]["verification"]["deterministic"] is True
    assert {item["type"] for item in body["result"]["conflicts"]} >= {
        "venue_schedule_overlap", "speaker_overlap"
    }
    assert db.get(EventSession, conflicted_session_id).venue_id == "venue_auditorium_b"
    assert db.get(Change, change_id) is not None
    assert db.get(Change, change_id).created_by == "operations@example.org"
    assert db.scalar(
        select(func.count()).select_from(Task).where(Task.source_change_id == change_id)
    ) > 0
    assert db.scalar(
        select(func.count()).select_from(Risk).where(Risk.source_change_id == change_id)
    ) > 0


def test_approval_passes_applied_change_and_verified_impact_to_notion_sync(api_context, monkeypatch) -> None:
    db, client = api_context
    from app.integrations.notion.sync import NotionSyncResult
    import app.api.routes as routes

    captured = {}

    def sync_spy(sync_db, change, verified, *, change_request=None):
        captured.update(db=sync_db, change=change, verified=verified, request=change_request)
        return NotionSyncResult(
            change_id=change.id, success=True, change_synced=True, records_created=1
        )

    monkeypatch.setattr(routes, "sync_change_to_notion", sync_spy)
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    response = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/accept"))

    assert response.status_code == 200
    body = response.json()
    assert body["request"]["status"] == "APPLIED"
    assert body["notion_sync"]["success"] is True
    assert body["notion_sync"]["change_synced"] is True
    assert captured["db"] is db
    assert captured["change"].id == body["result"]["change_id"]
    assert captured["verified"].change_id == body["result"]["change_id"]
    assert captured["request"].status == "APPLIED"
    assert captured["request"].reason == "Request venue relocation for approval"


def test_notion_sync_failure_does_not_revert_applied_request(api_context, monkeypatch) -> None:
    db, client = api_context
    from app.integrations.notion.sync import NotionSyncResult
    import app.api.routes as routes

    def failed_sync(_db, change, _verified, **_kwargs):
        return NotionSyncResult(
            change_id=change.id,
            success=False,
            failures=[{
                "record_type": "configuration",
                "error": "Missing Notion configuration",
                "category": "configuration",
            }],
        )

    monkeypatch.setattr(routes, "sync_change_to_notion", failed_sync)
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    response = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/accept"))

    assert response.status_code == 200
    assert response.json()["request"]["status"] == "APPLIED"
    assert response.json()["notion_sync"]["success"] is False
    assert db.get(ChangeRequestModel, created.json()["id"]).status == "APPLIED"


def test_duplicate_approval_does_not_execute_process_change_twice(api_context) -> None:
    _, client = api_context
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))
    request_id = created.json()["id"]

    from app.services.impact_service import process_change as real_process_change

    with patch("app.api.routes.process_change", wraps=real_process_change) as process_mock:
        first = asyncio.run(client.post(f"/change-requests/{request_id}/accept"))
        second = asyncio.run(client.post(f"/change-requests/{request_id}/accept"))

    assert first.status_code == 200
    assert first.json()["request"]["status"] == "APPLIED"
    assert second.status_code == 409
    assert process_mock.call_count == 1


@pytest.mark.parametrize(
    "status", ["PROCESSING", "APPLIED", "REJECTED", "FAILED", "APPROVED"]
)
def test_non_pending_status_never_executes_change(status: str, api_context) -> None:
    db, client = api_context
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))
    request_id = created.json()["id"]
    db.execute(
        update(ChangeRequestModel)
        .where(ChangeRequestModel.id == request_id)
        .values(status=status)
    )
    db.commit()

    with patch("app.api.routes.process_change") as process_mock:
        response = asyncio.run(client.post(f"/change-requests/{request_id}/accept"))

    assert response.status_code == 409
    process_mock.assert_not_called()


def test_invalid_approved_request_becomes_failed_without_applying(api_context) -> None:
    db, client = api_context
    original_venue_id = db.get(EventSession, SESSION_ID).venue_id
    original_change_count = db.scalar(select(func.count()).select_from(Change))
    created = asyncio.run(
        client.post(
            f"/events/{EVENT_ID}/change-requests",
            json=payload(new_value="venue_missing"),
        )
    )

    failed = asyncio.run(client.post(f"/change-requests/{created.json()['id']}/accept"))

    assert failed.status_code == 422
    assert db.get(ChangeRequestModel, created.json()["id"]).status == "FAILED"
    assert db.get(EventSession, SESSION_ID).venue_id == original_venue_id
    assert db.scalar(select(func.count()).select_from(Change)) == original_change_count


def test_downstream_failure_rolls_back_partial_mutation_and_marks_failed(api_context) -> None:
    db, client = api_context
    original_venue_id = db.get(EventSession, SESSION_ID).venue_id
    original_change_count = db.scalar(select(func.count()).select_from(Change))
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))

    with patch(
        "app.services.task_service.generate_follow_up_tasks",
        side_effect=RuntimeError("simulated downstream failure"),
    ):
        failed = asyncio.run(
            client.post(f"/change-requests/{created.json()['id']}/accept")
        )

    assert failed.status_code == 500
    assert db.get(ChangeRequestModel, created.json()["id"]).status == "FAILED"
    assert db.get(EventSession, SESSION_ID).venue_id == original_venue_id
    assert db.scalar(select(func.count()).select_from(Change)) == original_change_count


def test_missing_change_request_returns_404(api_context) -> None:
    _, client = api_context
    responses = [
        asyncio.run(client.get("/change-requests/not-found")),
        asyncio.run(client.post("/change-requests/not-found/accept")),
        asyncio.run(client.post("/change-requests/not-found/reject")),
    ]
    assert [response.status_code for response in responses] == [404, 404, 404]
    assert all(response.json() == {"detail": "Change request not found"} for response in responses)


@pytest.mark.parametrize("action", ["accept", "reject"])
def test_non_pending_request_cannot_be_accepted_or_rejected(api_context, action: str) -> None:
    _, client = api_context
    created = asyncio.run(client.post(f"/events/{EVENT_ID}/change-requests", json=payload()))
    request_id = created.json()["id"]
    first_transition = asyncio.run(client.post(f"/change-requests/{request_id}/accept"))

    second_transition = asyncio.run(client.post(f"/change-requests/{request_id}/{action}"))

    assert first_transition.status_code == 200
    assert first_transition.json()["request"]["status"] == "APPLIED"
    assert second_transition.status_code == 409
    assert "Only PENDING" in second_transition.json()["detail"]
