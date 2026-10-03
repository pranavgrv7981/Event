"""Notion mappings and sync behavior using an in-memory database and fake SDK."""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from datetime import date, datetime

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session, sessionmaker

from app import config
from app.api.routes import get_db
from app.database import Base
from app.integrations.notion.client import (
    NotionAPIError,
    NotionConfigurationError,
    NotionClient,
    NotionSettings,
)
from app.integrations.notion.databases import DATABASES
from app.integrations.notion.mapper import map_change, map_risk, map_session, map_task
from app.integrations.notion.sync import sync_change_request_to_notion, sync_change_to_notion
from app.main import app
from app.models import Change, ChangeRequest, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import AIImpactAnalysis, AIImpactAnalysisResponse
from app.services.impact_service import reconstruct_verified_impact

EVENT_ID = "event_notion_test"
CHANGE_ID = "change_notion_test"


def notion_settings() -> NotionSettings:
    return NotionSettings(
        api_key="test-token",
        sessions_database_id="db-sessions",
        tasks_database_id="db-tasks",
        risks_database_id="db-risks",
        changes_database_id="db-changes",
    )


class FakeNotionAPI:
    def __init__(self) -> None:
        self.page_records: dict[str, list[dict]] = {}
        self.next_id = 0
        self.fail_queries = False
        self.fail_query_source_id: str | None = None
        self.query_exception: Exception | None = None
        self.fail_create_source_id: str | None = None
        self.databases = self
        self.data_sources = self
        self.pages = self

    def retrieve(
        self, *, database_id: str | None = None, data_source_id: str | None = None
    ) -> dict:
        if database_id is not None:
            return {"data_sources": [{"id": f"source-{database_id}"}]}
        assert data_source_id is not None
        return {"properties": {}}

    def query(self, *, data_source_id: str, filter: dict, **_kwargs: object) -> dict:
        if self.fail_queries or data_source_id == self.fail_query_source_id:
            raise self.query_exception or RuntimeError("private token detail must not leak")
        prop_name = filter["property"]
        expected = filter["rich_text"]["equals"]
        found = []
        for page in self.page_records.get(data_source_id, []):
            rich_text = page["properties"].get(prop_name, {}).get("rich_text", [])
            if "".join(part["text"]["content"] for part in rich_text) == expected:
                found.append(page)
        return {"results": found, "has_more": False, "next_cursor": None}

    def create(self, *, parent: dict, properties: dict) -> dict:
        if parent["data_source_id"] == self.fail_create_source_id:
            raise RuntimeError("write details must not leak")
        self.next_id += 1
        page = {"id": f"page-{self.next_id}", "properties": properties}
        self.page_records.setdefault(parent["data_source_id"], []).append(page)
        return page

    def update(self, *, page_id: str, properties: dict) -> dict:
        for pages in self.page_records.values():
            for page in pages:
                if page["id"] == page_id:
                    page["properties"] = properties
                    return page
        raise RuntimeError("Page not found")

@pytest.fixture
def backend_db() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    event = Event(
        id=EVENT_ID,
        name="Notion Test Event",
        description="In-memory integration test.",
        date=date(2026, 11, 15),
        start_time=datetime(2026, 11, 15, 9),
        end_time=datetime(2026, 11, 15, 17),
        status="planned",
    )
    venue = Venue(
        id="venue_notion_test", event_id=EVENT_ID, name="Test Hall",
        location="Main building", capacity=100, status="confirmed",
    )
    speaker = Speaker(
        id="speaker_notion_test", event_id=EVENT_ID, name="Test Speaker",
        organization="Example Org", email="notion-speaker@example.org", title="Researcher",
    )
    volunteer = Volunteer(
        id="volunteer_notion_test", event_id=EVENT_ID, name="Test Owner",
        email="notion-volunteer@example.org", role="Operations", availability="available",
    )
    session = EventSession(
        id="session_notion_test", event_id=EVENT_ID, venue=venue,
        title="Test Session", description="Session for Notion sync.",
        start_time=datetime(2026, 11, 15, 10), end_time=datetime(2026, 11, 15, 11),
        status="scheduled", speakers=[speaker],
    )
    task = Task(
        id="task_notion_test", event_id=EVENT_ID, title="Check room",
        description="Verify room setup.", status="open", priority="high",
        due_time=datetime(2026, 11, 15, 9), assigned_volunteer=volunteer,
        session=session, venue=venue,
    )
    risk = Risk(
        id="risk_notion_test", event_id=EVENT_ID, title="Room readiness",
        description="Setup may run late.", severity="medium", status="open",
        session=session, venue=venue,
    )
    change = Change(
        id=CHANGE_ID, event_id=EVENT_ID, entity_type="venue", entity_id=venue.id,
        field_name="status", old_value="reserved", new_value="confirmed",
        reason="Operations confirmed the room.",
    )
    db.add_all([event, venue, speaker, volunteer, session, task, risk, change])
    db.commit()
    yield db
    db.close()
    engine.dispose()


@pytest.fixture
def fake_api() -> FakeNotionAPI:
    return FakeNotionAPI()


def analysis_for(verified) -> AIImpactAnalysisResponse:
    return AIImpactAnalysisResponse(
        change_id=verified.change_id,
        analysis_type="deterministic_fallback",
        provider="fallback",
        verified_impact=verified,
        analysis=AIImpactAnalysis(
            summary="Review the venue status update.",
            priority=verified.impact.severity,
            key_impacts=["The linked session remains associated with the venue."],
            recommended_actions=["Confirm the session room setup."],
            warnings=[],
        ),
    )


def test_notion_configuration_validation_reports_missing_variables() -> None:
    with pytest.raises(NotionConfigurationError) as error:
        NotionSettings("", "", "", "", "").validate()
    assert "NOTION_API_KEY" in str(error.value)
    assert "NOTION_CHANGES_DATABASE_ID" in str(error.value)


def test_mappers_match_operational_property_contract(backend_db: Session) -> None:
    session = backend_db.get(EventSession, "session_notion_test")
    task = backend_db.get(Task, "task_notion_test")
    risk = backend_db.get(Risk, "risk_notion_test")
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)

    assert map_session(session)["Speaker"]["rich_text"][0]["text"]["content"] == "Test Speaker"
    assert map_task(task)["Owner"]["rich_text"][0]["text"]["content"] == "Test Owner"
    assert map_task(task)["Description"]["rich_text"][0]["text"]["content"] == "Verify room setup."
    assert map_risk(risk)["Severity"] == {"select": {"name": "medium"}}
    mapped_change = map_change(change, verified, analysis_for(verified))
    assert mapped_change["Entity"]["rich_text"][0]["text"]["content"] == "venue/venue_notion_test"
    assert mapped_change["AI Recommended Actions"]["rich_text"][0]["text"]["content"] == "Confirm the session room setup."
    assert mapped_change["Reason"]["rich_text"][0]["text"]["content"] == change.reason
    assert mapped_change["Impact Summary"]["rich_text"][0]["text"]["content"].startswith("Severity:")
    assert "Sessions:" in mapped_change["Affected Entities"]["rich_text"][0]["text"]["content"]

    request = ChangeRequest(
        id="request_notion_test", event_id=EVENT_ID, entity_type="venue",
        entity_id="venue_notion_test", field_name="capacity", old_value="100",
        new_value="150", reason="Increase capacity for the demo.",
        created_by="test", status="APPLIED",
    )
    request_mapping = map_change(change, verified, analysis_for(verified), request)
    assert request_mapping["Request Status"]["rich_text"][0]["text"]["content"] == "APPLIED"
    assert request_mapping["Reason"]["rich_text"][0]["text"]["content"] == request.reason

    assert {
        "Request Status", "Reason", "Requester", "Affected Entities", "Impact Summary", "Conflicts"
    }.issubset(DATABASES["changes"].properties)


def test_rejected_change_request_maps_and_upserts_in_changes_database(fake_api: FakeNotionAPI) -> None:
    request = ChangeRequest(
        id="request_rejected_notion", event_id=EVENT_ID,
        entity_type="session", entity_id="session_notion_test",
        field_name="venue_id", old_value="venue_a", new_value="venue_b",
        reason="The proposed move overlaps another session.",
        created_by="admin@example.org", status="REJECTED",
    )
    notion = NotionClient(notion_settings(), api=fake_api)

    result = sync_change_request_to_notion(request, notion_client=notion)

    assert result.success is True
    assert result.change_synced is True
    properties = fake_api.page_records["source-db-changes"][0]["properties"]
    assert properties["Request Status"]["rich_text"][0]["text"]["content"] == "REJECTED"
    assert properties["Entity"]["rich_text"][0]["text"]["content"] == "session/session_notion_test"
    assert properties["Old Value"]["rich_text"][0]["text"]["content"] == "venue_a"
    assert properties["New Value"]["rich_text"][0]["text"]["content"] == "venue_b"
    assert properties["Reason"]["rich_text"][0]["text"]["content"] == request.reason
    assert properties["Requester"]["rich_text"][0]["text"]["content"] == request.created_by

    repeated = sync_change_request_to_notion(request, notion_client=notion)
    assert repeated.success is True
    assert repeated.records_updated == 1
    assert len(fake_api.page_records["source-db-changes"]) == 1


def test_rejected_request_sync_failure_is_reported(fake_api: FakeNotionAPI) -> None:
    request = ChangeRequest(
        id="request_rejected_failure", event_id=EVENT_ID,
        entity_type="session", entity_id="session_notion_test",
        field_name="venue_id", old_value="venue_a", new_value="venue_b",
        reason="Reject for test", status="REJECTED",
    )
    fake_api.fail_queries = True

    result = sync_change_request_to_notion(
        request, notion_client=NotionClient(notion_settings(), api=fake_api)
    )

    assert result.success is False
    assert result.change_synced is False
    assert result.failures[0].record_type == "changes"
    assert result.failures[0].category == "network"


def test_client_creates_then_updates_page_by_backend_id(fake_api: FakeNotionAPI) -> None:
    client = NotionClient(notion_settings(), api=fake_api)
    first = client.upsert_page(
        record_type="tasks", record_id="task-1",
        properties={"Task ID": {"rich_text": [{"text": {"content": "task-1"}}]}, "Title": {"title": [{"text": {"content": "First"}}]}},
    )
    second = client.upsert_page(
        record_type="tasks", record_id="task-1",
        properties={"Task ID": {"rich_text": [{"text": {"content": "task-1"}}]}, "Title": {"title": [{"text": {"content": "Updated"}}]}},
    )

    assert (first, second) == ("created", "updated")
    assert len(fake_api.page_records["source-db-tasks"]) == 1
    assert fake_api.page_records["source-db-tasks"][0]["properties"]["Title"]["title"][0]["text"]["content"] == "Updated"


def test_sdk_client_initializes_with_database_data_source_api() -> None:
    client = NotionClient(notion_settings())
    try:
        assert callable(client.api.databases.retrieve)
        assert callable(client.api.data_sources.query)
        assert callable(client.api.pages.create)
        assert callable(client.api.pages.update)
        assert client.api.options.notion_version == "2025-09-03"
    finally:
        client.api.close()


def test_client_wraps_notion_api_failures_without_leaking_details(fake_api: FakeNotionAPI) -> None:
    fake_api.fail_queries = True
    client = NotionClient(notion_settings(), api=fake_api)

    with pytest.raises(NotionAPIError) as error:
        client.upsert_page(record_type="tasks", record_id="task-1", properties={})
    assert error.value.category == "network"
    assert "Notion API request failed" in str(error.value)
    assert "private token detail" not in str(error.value)


def test_sync_reports_notion_api_failure(
    backend_db: Session, fake_api: FakeNotionAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.integrations.notion.sync as notion_sync

    monkeypatch.setattr(notion_sync, "analyze_verified_impact", analysis_for)
    fake_api.fail_queries = True
    notion = NotionClient(notion_settings(), api=fake_api)
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)

    result = sync_change_to_notion(backend_db, change, verified, notion_client=notion)

    assert result.success is False
    assert result.change_synced is False
    assert result.failures
    assert all("Notion API request failed" in failure.error for failure in result.failures)
    assert all("private token detail" not in failure.error for failure in result.failures)
    assert all(failure.category == "network" for failure in result.failures)


def test_missing_configuration_returns_structured_sync_failure(
    backend_db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    for name in (
        "NOTION_API_KEY", "NOTION_SESSIONS_DATABASE_ID", "NOTION_TASKS_DATABASE_ID",
        "NOTION_RISKS_DATABASE_ID", "NOTION_CHANGES_DATABASE_ID",
    ):
        monkeypatch.setattr(config, name, "")
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)

    result = sync_change_to_notion(backend_db, change, verified)

    assert result.success is False
    assert result.change_synced is False
    assert result.failures[0].record_type == "configuration"
    assert "NOTION_API_KEY" in result.failures[0].error


def test_sync_upserts_related_records_and_ai_actions(
    backend_db: Session, fake_api: FakeNotionAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.integrations.notion.sync as notion_sync

    monkeypatch.setattr(notion_sync, "analyze_verified_impact", analysis_for)
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)
    notion = NotionClient(notion_settings(), api=fake_api)

    result = sync_change_to_notion(backend_db, change, verified, notion_client=notion)

    assert result.success is True
    assert result.change_synced is True
    assert result.sessions_synced == 1
    assert result.tasks_synced == 1
    assert result.risks_synced == 1
    assert result.ai_recommended_actions_synced == 1
    assert result.failures == []
    assert fake_api.page_records["source-db-changes"][0]["properties"]["AI Recommended Actions"]
    assert result.records_created == 4

    repeated = sync_change_to_notion(backend_db, change, verified, notion_client=notion)
    assert repeated.success is True
    assert repeated.records_created == 0
    assert repeated.records_updated == 4
    assert all(len(pages) == 1 for pages in fake_api.page_records.values())


def test_sync_reports_duplicate_matches_without_updating_an_arbitrary_page(
    backend_db: Session, fake_api: FakeNotionAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.integrations.notion.sync as notion_sync

    monkeypatch.setattr(notion_sync, "analyze_verified_impact", analysis_for)
    identity = {"rich_text": [{"text": {"content": "task_notion_test"}}]}
    fake_api.page_records["source-db-tasks"] = [
        {"id": "duplicate-1", "properties": {"Task ID": identity}},
        {"id": "duplicate-2", "properties": {"Task ID": identity}},
    ]
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)

    result = sync_change_to_notion(
        backend_db, change, verified, notion_client=NotionClient(notion_settings(), api=fake_api)
    )

    failure = next(item for item in result.failures if item.record_type == "tasks")
    assert result.success is False
    assert result.change_synced is True
    assert failure.category == "duplicate_match"
    assert failure.duplicate_matches == 2
    assert [page["id"] for page in fake_api.page_records["source-db-tasks"]] == [
        "duplicate-1", "duplicate-2"
    ]


def test_sync_reports_partial_record_failure_without_hiding_successes(
    backend_db: Session, fake_api: FakeNotionAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.integrations.notion.sync as notion_sync

    monkeypatch.setattr(notion_sync, "analyze_verified_impact", analysis_for)
    fake_api.fail_create_source_id = "source-db-tasks"
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)

    result = sync_change_to_notion(
        backend_db, change, verified, notion_client=NotionClient(notion_settings(), api=fake_api)
    )

    assert result.success is False
    assert result.sessions_synced == result.risks_synced == 1
    assert result.change_synced is True
    assert result.records_created == 3
    assert any(item.record_type == "tasks" for item in result.failures)


def test_rate_limit_is_classified_in_sync_result(
    backend_db: Session, fake_api: FakeNotionAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.integrations.notion.sync as notion_sync

    class RateLimitError(RuntimeError):
        status = 429
        code = "rate_limited"

    monkeypatch.setattr(notion_sync, "analyze_verified_impact", analysis_for)
    fake_api.fail_query_source_id = "source-db-tasks"
    fake_api.query_exception = RateLimitError("private response content")
    change = backend_db.get(Change, CHANGE_ID)
    verified = reconstruct_verified_impact(backend_db, change)

    result = sync_change_to_notion(
        backend_db, change, verified, notion_client=NotionClient(notion_settings(), api=fake_api)
    )
    task_failure = next(item for item in result.failures if item.record_type == "tasks")

    assert result.success is False
    assert task_failure.category == "rate_limit"
    assert task_failure.status_code == 429
    assert "private response content" not in task_failure.error


def test_sync_endpoint_returns_per_record_result(
    backend_db: Session, fake_api: FakeNotionAPI, monkeypatch: pytest.MonkeyPatch
) -> None:
    import app.integrations.notion.sync as notion_sync

    monkeypatch.setattr(notion_sync, "analyze_verified_impact", analysis_for)
    notion = NotionClient(notion_settings(), api=fake_api)
    monkeypatch.setattr(notion_sync, "build_notion_client", lambda: notion)

    def override_get_db() -> Iterator[Session]:
        yield backend_db

    app.dependency_overrides[get_db] = override_get_db

    async def request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(f"/changes/{CHANGE_ID}/sync-notion")

    try:
        response = asyncio.run(request())
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json()["change_synced"] is True
    assert response.json()["sessions_synced"] == 1
    assert response.json()["tasks_synced"] == 1
    assert response.json()["risks_synced"] == 1
