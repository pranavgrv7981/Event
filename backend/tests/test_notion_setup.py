"""Mocked tests for automated Notion workspace setup and verification."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

import pytest

from app import config
from app.integrations.notion.client import NotionConfigurationError, NotionSettings
from app.integrations.notion.databases import DATABASES
from app.integrations.notion.setup import DATABASE_TITLES, run_notion_setup


class FakeSetupAPI:
    def __init__(self) -> None:
        self.users = self
        self.databases = self
        self.data_sources = self
        self.pages = self
        self.database_rows: dict[str, dict[str, Any]] = {}
        self.sources: dict[str, dict[str, Any]] = {}
        self.page_rows: dict[str, list[dict[str, Any]]] = {}
        self.database_creates = 0
        self.next_page = 0
        self.invalid_credentials = False

    def me(self) -> dict[str, str]:
        if self.invalid_credentials:
            raise RuntimeError("private token response")
        return {"object": "user"}

    def search(self, *, query: str, **_kwargs: Any) -> dict[str, Any]:
        matches = []
        for row in self.database_rows.values():
            if row["title"] == query:
                matches.append({
                    "object": "database",
                    "id": row["id"],
                    "title": [{"plain_text": row["title"]}],
                    "parent": {"type": "page_id", "page_id": row["parent_page_id"]},
                })
        return {"results": matches, "has_more": False, "next_cursor": None}

    def create(self, *, parent: dict[str, str], title: list[dict] | None = None,
               initial_data_source: dict | None = None, properties: dict[str, Any] | None = None) -> dict[str, Any]:
        if title is None:
            self.next_page += 1
            page = {
                "id": f"page-{self.next_page}",
                "properties": deepcopy(properties or {}),
                "in_trash": False,
            }
            self.page_rows[parent["data_source_id"]].append(page)
            return page
        self.database_creates += 1
        database_id = f"db-{self.database_creates}"
        source_id = f"source-{self.database_creates}"
        title_text = title[0]["text"]["content"]
        record_type = next(name for name, label in DATABASE_TITLES.items() if label == title_text)
        self.database_rows[database_id] = {
            "id": database_id,
            "title": title_text,
            "parent_page_id": parent["page_id"],
            "source_id": source_id,
        }
        self.sources[source_id] = {
            "id": source_id,
            "archived": False,
            "properties": {
                name: {"id": "title" if schema.get("title") is not None else f"prop-{name}",
                       "type": next(iter(schema)), **deepcopy(schema)}
                for name, schema in (initial_data_source or {})["properties"].items()
            },
        }
        self.page_rows[source_id] = []
        return {"id": database_id}

    def retrieve(self, *, database_id: str | None = None, data_source_id: str | None = None) -> dict[str, Any]:
        if database_id:
            row = self.database_rows[database_id]
            return {
                "id": database_id,
                "title": [{"plain_text": row["title"]}],
                "parent": {"type": "page_id", "page_id": row["parent_page_id"]},
                "data_sources": [{"id": row["source_id"]}],
            }
        assert data_source_id is not None
        return deepcopy(self.sources[data_source_id])

    def update(self, *, data_source_id: str | None = None, page_id: str | None = None,
               properties: dict[str, Any] | None = None, in_trash: bool | None = None) -> dict[str, Any]:
        if data_source_id:
            schema = self.sources[data_source_id]["properties"]
            for key, value in (properties or {}).items():
                if isinstance(value, dict) and isinstance(value.get("name"), str):
                    old_name = next((name for name, prop in schema.items() if prop.get("id") == key), key)
                    schema[value["name"]] = schema.pop(old_name)
                    continue
                if isinstance(value, dict) and "select" in value:
                    prior = schema[key].get("select", {}).get("options", [])
                    by_id = {option.get("id"): option for option in prior if option.get("id")}
                    by_name = {option.get("name"): option for option in prior}
                    options = []
                    for option in value["select"].get("options", []):
                        kept = by_id.get(option.get("id")) or by_name.get(option.get("name"))
                        options.append(deepcopy(kept or {"name": option["name"]}))
                    schema[key]["select"]["options"] = options
                    continue
                if key not in schema:
                    type_name, type_value = next(iter(value.items()))
                    schema[key] = {"id": f"prop-{key}", "type": type_name, type_name: deepcopy(type_value)}
            return self.sources[data_source_id]
        assert page_id is not None
        for rows in self.page_rows.values():
            for page in rows:
                if page["id"] == page_id:
                    if properties is not None:
                        page["properties"] = deepcopy(properties)
                    if in_trash is not None:
                        page["in_trash"] = in_trash
                    return page
        raise RuntimeError("page not found")

    def query(self, *, data_source_id: str, filter: dict[str, Any] | None = None, **_kwargs: Any) -> dict[str, Any]:
        rows = [page for page in self.page_rows[data_source_id] if page.get("in_trash") is not True]
        if filter:
            key = filter["property"]
            expected = filter["rich_text"]["equals"]
            rows = [
                page for page in rows
                if "".join(
                    part.get("plain_text") or part.get("text", {}).get("content", "")
                    for part in page.get("properties", {}).get(key, {}).get("rich_text", [])
                ) == expected
            ]
        return {"results": rows, "has_more": False, "next_cursor": None}

@pytest.fixture
def setup_environment(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setattr(config, "NOTION_API_KEY", "mocked-credential")
    monkeypatch.setattr(config, "NOTION_SESSIONS_DATABASE_ID", "")
    monkeypatch.setattr(config, "NOTION_TASKS_DATABASE_ID", "")
    monkeypatch.setattr(config, "NOTION_RISKS_DATABASE_ID", "")
    monkeypatch.setattr(config, "NOTION_CHANGES_DATABASE_ID", "")
    from app.integrations.notion import client
    from app.integrations.notion import setup

    config_path = tmp_path / ".notion-databases.json"
    monkeypatch.setattr(client, "LOCAL_DATABASE_CONFIG", config_path)
    monkeypatch.setattr(setup, "LOCAL_DATABASE_CONFIG", config_path)
    monkeypatch.setattr(setup, "_current_backend_select_options", lambda: {
        "sessions": {"Status": {"scheduled"}},
        "tasks": {"Status": {"open"}, "Priority": {"medium"}},
        "risks": {"Status": {"open"}, "Severity": {"low"}},
    })


def test_setup_creates_four_databases_and_persists_only_non_secret_ids(
    setup_environment: None,
) -> None:
    from app.integrations.notion import client

    api = FakeSetupAPI()
    result = run_notion_setup(api=api, parent_page_id="parent-1")

    assert api.database_creates == 4
    assert set(result["database_ids"]) == set(DATABASES)
    assert result["databases"] == {name: "created" for name in DATABASES}
    assert result["preflight"]["ready"] is False
    assert client.LOCAL_DATABASE_CONFIG.exists()
    contents = client.LOCAL_DATABASE_CONFIG.read_text(encoding="utf-8")
    assert "mocked-credential" not in contents
    assert "database_ids" in contents
    assert NotionSettings.from_environment().sessions_database_id == result["database_ids"]["sessions"]


def test_explicit_database_environment_value_overrides_local_config(
    setup_environment: None, monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.integrations.notion import client

    client.LOCAL_DATABASE_CONFIG.write_text(
        '{"database_ids":{"sessions":"local-session"}}', encoding="utf-8"
    )
    monkeypatch.setattr(config, "NOTION_SESSIONS_DATABASE_ID", "env-session")

    assert NotionSettings.from_environment().sessions_database_id == "env-session"


def test_setup_is_repeatable_and_reuses_matching_databases(setup_environment: None) -> None:
    api = FakeSetupAPI()

    first = run_notion_setup(api=api, parent_page_id="parent-1", verify_write=True)
    second = run_notion_setup(api=api, parent_page_id="parent-1", verify_write=True)

    assert api.database_creates == 4
    assert second["databases"] == {name: "reused" for name in DATABASES}
    assert second["preflight"]["ready"] is True
    assert first["database_ids"] == second["database_ids"]


def test_setup_adds_missing_schema_and_select_options_without_removing_existing(
    setup_environment: None,
) -> None:
    api = FakeSetupAPI()
    run_notion_setup(api=api, parent_page_id="parent-1", verify_write=True)
    sessions = next(row for row in api.database_rows.values() if row["title"] == "Sessions")
    source = api.sources[sessions["source_id"]]
    del source["properties"]["Speaker"]
    source["properties"]["Status"]["select"]["options"].append({"id": "custom-opt", "name": "Custom"})
    source["properties"]["Status"]["select"]["options"] = [
        option for option in source["properties"]["Status"]["select"]["options"]
        if option["name"] != "scheduled"
    ]

    result = run_notion_setup(api=api, parent_page_id="parent-1", verify_write=True)

    assert result["preflight"]["ready"] is True
    assert source["properties"]["Speaker"]["type"] == "rich_text"
    option_names = {option["name"] for option in source["properties"]["Status"]["select"]["options"]}
    assert {"scheduled", "Custom"}.issubset(option_names)


def test_setup_rejects_duplicate_database_names_under_parent(setup_environment: None) -> None:
    api = FakeSetupAPI()
    run_notion_setup(api=api, parent_page_id="parent-1", verify_write=True)
    original = next(row for row in api.database_rows.values() if row["title"] == "Risks")
    api.database_creates += 1
    duplicate_id = f"db-{api.database_creates}"
    duplicate_source = f"source-{api.database_creates}"
    api.database_rows[duplicate_id] = {**original, "id": duplicate_id, "source_id": duplicate_source}
    api.sources[duplicate_source] = deepcopy(api.sources[original["source_id"]])
    api.sources[duplicate_source]["id"] = duplicate_source
    api.page_rows[duplicate_source] = []

    with pytest.raises(NotionConfigurationError, match="Found 2 exact Risks databases"):
        run_notion_setup(api=api, parent_page_id="parent-1")


def test_setup_sync_test_uses_actual_sync_service_and_cleans_only_probe_pages(
    setup_environment: None,
) -> None:
    api = FakeSetupAPI()

    result = run_notion_setup(
        api=api,
        parent_page_id="parent-1",
        verify_sync=True,
    )

    assert result["preflight"]["ready"] is True
    assert result["sync_test"]["pass"] is True
    assert result["sync_test"]["first_sync"] == {"created": 4, "updated": 0, "success": True}
    assert result["sync_test"]["second_sync"] == {"created": 0, "updated": 4, "success": True}
    assert result["sync_test"]["sessions_tasks_risks_change_synced"] is True
    assert result["sync_test"]["cleanup"] == "pass"
    assert all(page["in_trash"] is True for rows in api.page_rows.values() for page in rows)
