"""Live-preflight behavior exercised through a deterministic fake SDK."""

from __future__ import annotations

from typing import Any

from app.integrations.notion.client import NotionClient, NotionSettings
from app.integrations.notion.databases import DATABASES
from app.integrations.notion.preflight import run_notion_preflight


class FakeNotionError(RuntimeError):
    def __init__(self, message: str, status: int, code: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code


def notion_settings() -> NotionSettings:
    return NotionSettings(
        api_key="fake-not-a-secret",
        sessions_database_id="db-sessions",
        tasks_database_id="db-tasks",
        risks_database_id="db-risks",
        changes_database_id="db-changes",
    )


def property_schema(record_type: str) -> dict[str, dict[str, Any]]:
    result = {}
    for name, definition in DATABASES[record_type].properties.items():
        prop: dict[str, Any] = {"type": definition.property_type}
        if definition.property_type == "select":
            prop["select"] = {
                "options": [{"name": item} for item in definition.required_options]
            }
        result[name] = prop
    return result


class FakeNotionAPI:
    def __init__(self) -> None:
        self.users = self
        self.databases = self
        self.data_sources = self
        self.pages = self
        self.fail_credentials = False
        self.fail_database: str | None = None
        self.fail_query: str | None = None
        self.fail_create: str | None = None
        self.fail_update: str | None = None
        self.multiple_sources: str | None = None
        self.archived_source: str | None = None
        self.archived_secondary = False
        self.schemas = {name: property_schema(name) for name in DATABASES}
        self.page_records: dict[str, list[dict[str, Any]]] = {
            f"source-db-{name}": [] for name in DATABASES
        }
        self.next_id = 0

    def me(self) -> dict[str, str]:
        if self.fail_credentials:
            raise FakeNotionError("credential text must not be returned", 401, "unauthorized")
        return {"object": "user"}

    def retrieve(self, *, database_id: str | None = None, data_source_id: str | None = None) -> dict[str, Any]:
        if database_id is not None:
            record_type = database_id.removeprefix("db-")
            if self.fail_database == record_type:
                raise FakeNotionError("database text must not be returned", 403, "restricted_resource")
            sources = [{"id": f"source-{database_id}"}]
            if self.multiple_sources == record_type:
                sources.append({"id": f"source-{database_id}-second"})
            return {"data_sources": sources}
        assert data_source_id is not None
        database_id = data_source_id.removeprefix("source-")
        record_type = database_id.removeprefix("db-").removesuffix("-second")
        result: dict[str, Any] = {"properties": self.schemas[record_type]}
        if self.archived_source == record_type or (
            self.archived_secondary and data_source_id.endswith("-second")
        ):
            result["archived"] = True
        return result

    def query(self, *, data_source_id: str, **kwargs: Any) -> dict[str, Any]:
        record_type = data_source_id.removeprefix("source-db-")
        if self.fail_query == record_type:
            raise FakeNotionError("permission detail must not leak", 403, "restricted_resource")
        identity_filter = kwargs.get("filter")
        if identity_filter:
            prop_name = identity_filter["property"]
            expected = identity_filter["rich_text"]["equals"]
            pages = [
                page for page in self.page_records[data_source_id]
                if page.get("in_trash") is not True
                and page.get("properties", {}).get(prop_name, {}).get("rich_text", [{}])[0]
                .get("text", {}).get("content") == expected
            ]
        else:
            pages = []
        return {"results": pages, "has_more": False, "next_cursor": None}

    def create(self, *, parent: dict[str, str], properties: dict[str, Any]) -> dict[str, Any]:
        source_id = parent["data_source_id"]
        record_type = source_id.removeprefix("source-db-")
        if self.fail_create == record_type:
            raise FakeNotionError("write capability detail must not leak", 403, "restricted_resource")
        self.next_id += 1
        page = {"id": f"page-{self.next_id}", "properties": properties, "in_trash": False}
        self.page_records[source_id].append(page)
        return page

    def update(self, *, page_id: str, properties: dict[str, Any] | None = None, in_trash: bool | None = None) -> dict[str, Any]:
        for source_pages in self.page_records.values():
            for page in source_pages:
                if page["id"] != page_id:
                    continue
                if self.fail_update and page_id.startswith(self.fail_update):
                    raise FakeNotionError("update capability detail must not leak", 403, "restricted_resource")
                if properties is not None:
                    page["properties"] = properties
                if in_trash is not None:
                    page["in_trash"] = in_trash
                return page
        raise FakeNotionError("page not found", 404, "object_not_found")


def test_preflight_validates_all_four_databases_and_write_probe_cleanup() -> None:
    fake = FakeNotionAPI()
    result = run_notion_preflight(
        NotionClient(notion_settings(), api=fake),
        verify_write_permissions=True,
    )

    assert result.ready is True
    assert result.credentials_status == "pass"
    assert [item.record_type for item in result.databases] == list(DATABASES)
    assert all(item.status == "pass" for item in result.databases)
    assert all(item.write_permission_status == "pass" for item in result.databases)
    assert all(
        page["in_trash"] is True
        for pages in fake.page_records.values()
        for page in pages
    )


def test_preflight_invalid_credentials_are_actionable_and_sanitized() -> None:
    fake = FakeNotionAPI()
    fake.fail_credentials = True

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))

    assert result.ready is False
    assert result.credentials_status == "fail"
    assert "credential text" not in str(result.model_dump())
    assert result.diagnostics[0].code == "credentials"


def test_preflight_reports_inaccessible_database() -> None:
    fake = FakeNotionAPI()
    fake.fail_database = "risks"

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    risk = next(item for item in result.databases if item.record_type == "risks")

    assert result.ready is False
    assert risk.status == "fail"
    assert risk.diagnostics[0].code == "permission"
    assert "database text" not in str(risk.model_dump())


def test_preflight_reports_missing_required_property() -> None:
    fake = FakeNotionAPI()
    del fake.schemas["sessions"]["Session ID"]

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    sessions = result.databases[0]

    assert sessions.schema_status == "fail"
    assert any(
        item.code == "missing_property" and "Session ID" in item.message
        for item in sessions.diagnostics
    )


def test_preflight_reports_incorrect_property_type() -> None:
    fake = FakeNotionAPI()
    fake.schemas["tasks"]["Due Time"]["type"] = "rich_text"

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    tasks = next(item for item in result.databases if item.record_type == "tasks")

    assert any(
        item.code == "wrong_property_type" and "Due Time" in item.message
        for item in tasks.diagnostics
    )


def test_preflight_reports_missing_select_option() -> None:
    fake = FakeNotionAPI()
    fake.schemas["tasks"]["Status"]["select"]["options"].remove(
        {"name": "cancelled"}
    )

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    tasks = next(item for item in result.databases if item.record_type == "tasks")

    assert any(
        item.code == "missing_select_options" and "cancelled" in item.message
        for item in tasks.diagnostics
    )


def test_preflight_rejects_multiple_data_sources() -> None:
    fake = FakeNotionAPI()
    fake.multiple_sources = "changes"

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    changes = next(item for item in result.databases if item.record_type == "changes")

    assert changes.status == "fail"
    assert "2 active data sources" in changes.diagnostics[0].message


def test_preflight_rejects_archived_data_source() -> None:
    fake = FakeNotionAPI()
    fake.archived_source = "risks"

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    risks = next(item for item in result.databases if item.record_type == "risks")

    assert risks.status == "fail"
    assert "no active data source" in risks.diagnostics[0].message


def test_preflight_accepts_one_active_source_and_ignores_archived_secondary() -> None:
    fake = FakeNotionAPI()
    fake.multiple_sources = "changes"
    fake.archived_secondary = True

    result = run_notion_preflight(NotionClient(notion_settings(), api=fake))
    changes = next(item for item in result.databases if item.record_type == "changes")

    assert changes.data_source_status == "pass"


def test_preflight_requires_explicit_write_verification_for_ready_status() -> None:
    result = run_notion_preflight(NotionClient(notion_settings(), api=FakeNotionAPI()))

    assert result.ready is False
    assert all(item.write_permission_status == "not_checked" for item in result.databases)
    assert all(
        any(item.code == "write_permission_not_checked" for item in db.diagnostics)
        for db in result.databases
    )


def test_preflight_reports_write_permission_failure() -> None:
    fake = FakeNotionAPI()
    fake.fail_create = "tasks"

    result = run_notion_preflight(
        NotionClient(notion_settings(), api=fake),
        verify_write_permissions=True,
    )
    tasks = next(item for item in result.databases if item.record_type == "tasks")

    assert result.ready is False
    assert tasks.write_permission_status == "fail"
    assert tasks.diagnostics[-1].code == "permission"
    assert "write capability detail" not in str(tasks.model_dump())
