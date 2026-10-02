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
from app.integrations.notion.mapper import map_change, map_risk, map_session, map_task
from app.integrations.notion.sync import sync_change_to_notion
from app.main import app
from app.models import Change, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
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
        self.databases = self
        self.data_sources = self
        self.pages = self

    def retrieve(self, *, database_id: str) -> dict:
        return {"data_sources": [{"id": f"source-{database_id}"}]}

    def query(self, *, data_source_id: str, filter: dict, **_kwargs: object) -> dict:
        if self.fail_queries:
            raise RuntimeError("private token detail must not leak")
        prop_name = filter["property"]
        expected = filter["rich_text"]["equals"]
        found = []
        for page in self.page_records.get(data_source_id, []):
            rich_text = page["properties"].get(prop_name, {}).get("rich_text", [])
            if "".join(part["text"]["content"] for part in rich_text) == expected:
                found.append(page)
        return {"results": found, "has_more": False, "next_cursor": None}

    def create(self, *, parent: dict, properties: dict) -> dict:
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
    assert map_risk(risk)["Severity"] == {"select": {"name": "medium"}}
    mapped_change = map_change(change, verified, analysis_for(verified))
    assert mapped_change["Entity"]["rich_text"][0]["text"]["content"] == "venue/venue_notion_test"
    assert mapped_change["AI Recommended Actions"]["rich_text"][0]["text"]["content"] == "Confirm the session room setup."


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
    assert "RuntimeError" in str(error.value)
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
