"""Create, repair, and verify the four Notion databases used by backend sync."""

from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from app import config
from app.database import Base
from app.integrations.notion.client import (
    LOCAL_DATABASE_CONFIG,
    NOTION_VERSION,
    NotionAPIError,
    NotionClient,
    NotionConfigurationError,
    NotionSettings,
    create_notion_api,
)
from app.integrations.notion.databases import DATABASES
from app.integrations.notion.preflight import (
    _current_backend_select_options,
    _validate_schema,
    run_notion_preflight,
)

DATABASE_TITLES = {
    "sessions": "Sessions",
    "tasks": "Tasks",
    "risks": "Risks",
    "changes": "Changes",
}


def _normalized_id(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    return value.replace("-", "").lower()


def _rich_title(value: object) -> str:
    if not isinstance(value, list):
        return ""
    return "".join(
        part.get("plain_text") or part.get("text", {}).get("content", "")
        for part in value
        if isinstance(part, dict)
    )


def _database_parent_and_title(api: Any, result: dict[str, Any]) -> tuple[str | None, str]:
    title = _rich_title(result.get("title"))
    parent = result.get("parent")
    if not isinstance(parent, dict):
        parent = {}
    if result.get("object") == "data_source":
        database_id = parent.get("database_id")
        if not isinstance(database_id, str):
            return None, title
        database = api.databases.retrieve(database_id=database_id)
        db_parent = database.get("parent", {}) if isinstance(database, dict) else {}
        title = title or _rich_title(database.get("title", []))
        return db_parent.get("page_id") if isinstance(db_parent, dict) else None, title
    return parent.get("page_id"), title


def _search_databases(api: Any, title: str, parent_page_id: str) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    cursor: str | None = None
    seen: set[str] = set()
    while True:
        arguments: dict[str, Any] = {"query": title, "page_size": 100}
        if cursor:
            arguments["start_cursor"] = cursor
        response = api.search(**arguments)
        if not isinstance(response, dict) or not isinstance(response.get("results"), list):
            raise NotionConfigurationError("Notion search returned a malformed response.")
        for item in response["results"]:
            if not isinstance(item, dict) or item.get("object") not in {"database", "data_source"}:
                continue
            item_parent, item_title = _database_parent_and_title(api, item)
            if (
                item_title.casefold() == title.casefold()
                and _normalized_id(item_parent) == _normalized_id(parent_page_id)
            ):
                database_id = item.get("id")
                if item.get("object") == "data_source":
                    parent = item.get("parent", {})
                    database_id = parent.get("database_id") if isinstance(parent, dict) else None
                if isinstance(database_id, str) and all(row["id"] != database_id for row in found):
                    found.append({"id": database_id, "source": item})
        if not response.get("has_more"):
            return found
        cursor = response.get("next_cursor")
        if not isinstance(cursor, str) or not cursor or cursor in seen:
            raise NotionConfigurationError("Notion search returned an invalid pagination cursor.")
        seen.add(cursor)


def _property_schema(record_type: str, backend_options: dict[str, dict[str, set[str]]]) -> dict[str, dict[str, Any]]:
    schema: dict[str, dict[str, Any]] = {}
    definition = DATABASES[record_type]
    for name, prop in definition.properties.items():
        if prop.property_type == "select":
            values = set(prop.required_options)
            values.update(backend_options.get(record_type, {}).get(name, set()))
            schema[name] = {"select": {"options": [{"name": item} for item in sorted(values)]}}
        else:
            schema[name] = {prop.property_type: {}}
    return schema


def _ensure_schema(
    api: Any,
    notion: NotionClient,
    record_type: str,
    backend_options: dict[str, dict[str, set[str]]],
) -> dict[str, Any]:
    inspected = notion.inspect_database(record_type)
    data_source_id = inspected["data_source_id"]
    properties = inspected["data_source"].get("properties")
    if not isinstance(properties, dict):
        raise NotionConfigurationError(f"{DATABASE_TITLES[record_type]} has no readable data-source schema.")

    expected = DATABASES[record_type]
    changes: dict[str, Any] = {}
    title_name = expected.title_property
    if title_name not in properties:
        title_props = [
            (name, value)
            for name, value in properties.items()
            if isinstance(value, dict) and value.get("type") == "title"
        ]
        if title_props:
            existing_name, existing_title = title_props[0]
            property_id = existing_title.get("id")
            changes[property_id if isinstance(property_id, str) else existing_name] = {"name": title_name}

    for name, prop in expected.properties.items():
        actual = properties.get(name)
        if actual is None:
            if name != title_name:
                changes[name] = _property_schema(record_type, backend_options)[name]
            continue
        actual_type = actual.get("type") if isinstance(actual, dict) else None
        if actual_type != prop.property_type:
            raise NotionConfigurationError(
                f"{DATABASE_TITLES[record_type]} property {name!r} has type "
                f"{actual_type or 'unknown'}; expected {prop.property_type}. "
                "No existing property values were changed."
            )
        if prop.property_type == "select":
            select = actual.get("select", {})
            current_options = select.get("options", []) if isinstance(select, dict) else []
            current_names = {
                option.get("name") for option in current_options if isinstance(option, dict)
            }
            wanted = set(prop.required_options) | backend_options.get(record_type, {}).get(name, set())
            if not wanted.issubset(current_names):
                preserved = [
                    {"id": option["id"]} if isinstance(option.get("id"), str)
                    else {"name": option["name"]}
                    for option in current_options
                    if isinstance(option, dict) and isinstance(option.get("name"), str)
                ]
                preserved.extend({"name": item} for item in sorted(wanted - current_names))
                changes[name] = {
                    "select": {"options": preserved},
                    **({"description": actual["description"]} if actual.get("description") else {}),
                }

    if changes:
        api.data_sources.update(data_source_id=data_source_id, properties=changes)
        notion._data_source_ids.pop(notion.settings.database_id(record_type), None)
        inspected = notion.inspect_database(record_type)

    diagnostics = _validate_schema(
        record_type,
        inspected["data_source"].get("properties"),
        backend_options,
    )
    if diagnostics:
        detail = "; ".join(item.message for item in diagnostics)
        raise NotionConfigurationError(f"{DATABASE_TITLES[record_type]} schema validation failed: {detail}")
    return inspected


def _create_database(api: Any, parent_page_id: str, record_type: str, backend_options: dict[str, dict[str, set[str]]]) -> dict[str, Any]:
    return api.databases.create(
        parent={"type": "page_id", "page_id": parent_page_id},
        title=[{"type": "text", "text": {"content": DATABASE_TITLES[record_type]}}],
        initial_data_source={"properties": _property_schema(record_type, backend_options)},
    )


def _persist_database_ids(parent_page_id: str, database_ids: dict[str, str]) -> None:
    payload = json.dumps(
        {"parent_page_id": parent_page_id, "database_ids": database_ids},
        indent=2,
        sort_keys=True,
    ) + "\n"
    temporary = LOCAL_DATABASE_CONFIG.with_suffix(".json.tmp")
    try:
        temporary.write_text(payload, encoding="utf-8")
        os.replace(temporary, LOCAL_DATABASE_CONFIG)
    finally:
        temporary.unlink(missing_ok=True)


def _run_real_sync_probe(notion: NotionClient) -> dict[str, Any]:
    """Run the actual sync service using temporary, in-memory backend records."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from app.integrations.ai.fallback import LocalFallbackProvider
    from app.models import Change, Event, Risk, Session as EventSession, Task, Venue
    from app.services.ai_impact_service import analyze_verified_impact
    from app.services.impact_service import reconstruct_verified_impact
    from app.integrations.notion.sync import sync_change_to_notion

    suffix = uuid4().hex
    event_id = f"notion_probe_event_{suffix}"
    venue_id = f"notion_probe_venue_{suffix}"
    session_id = f"notion_probe_session_{suffix}"
    task_id = f"notion_probe_task_{suffix}"
    risk_id = f"notion_probe_risk_{suffix}"
    change_id = f"notion_probe_change_{suffix}"
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    first: dict[str, Any] = {}
    second: dict[str, Any] = {}
    cleanup_failures: list[str] = []
    try:
        event = Event(
            id=event_id, name="Notion Setup Verification", description="Temporary in-memory test.",
            date=date.today(), start_time=now, end_time=now.replace(hour=(now.hour + 1) % 24), status="planned",
        )
        venue = Venue(
            id=venue_id, event_id=event_id, name="Temporary Venue", location="Test only",
            capacity=20, status="confirmed",
        )
        session = EventSession(
            id=session_id, event_id=event_id, venue_id=venue_id, title="Temporary Session",
            description="Created only in memory for Notion setup verification.",
            start_time=now, end_time=now.replace(hour=(now.hour + 1) % 24), status="scheduled",
        )
        task = Task(
            id=task_id, event_id=event_id, title="Temporary Task", description="Verification only.",
            status="open", priority="medium", due_time=now, session_id=session_id, venue_id=venue_id,
        )
        risk = Risk(
            id=risk_id, event_id=event_id, title="Temporary Risk", description="Verification only.",
            severity="low", status="open", session_id=session_id, venue_id=venue_id,
        )
        change = Change(
            id=change_id, event_id=event_id, entity_type="venue", entity_id=venue_id,
            field_name="name", old_value="Old temporary name", new_value="Temporary Venue",
            reason="Temporary Notion setup verification.",
        )
        db.add_all([event, venue, session, task, risk, change])
        db.commit()
        verified = reconstruct_verified_impact(db, change)
        fallback_analysis = lambda value: analyze_verified_impact(value, LocalFallbackProvider())
        first_result = sync_change_to_notion(db, change, verified, notion_client=notion, analysis_function=fallback_analysis)
        second_result = sync_change_to_notion(db, change, verified, notion_client=notion, analysis_function=fallback_analysis)
        first = first_result.model_dump()
        second = second_result.model_dump()
        first["pass"] = bool(
            first_result.success and first_result.records_created == 4
            and first_result.sessions_synced == first_result.tasks_synced == first_result.risks_synced == 1
            and first_result.change_synced
        )
        second["pass"] = bool(
            second_result.success and second_result.records_created == 0
            and second_result.records_updated == 4 and second_result.failures == []
        )
    finally:
        for record_type, record_id in (
            ("sessions", session_id), ("tasks", task_id), ("risks", risk_id), ("changes", change_id)
        ):
            try:
                definition = DATABASES[record_type]
                pages = notion.query_database(
                    notion.settings.database_id(record_type),
                    filter={"property": definition.identity_property, "rich_text": {"equals": record_id}},
                )
                if not pages:
                    continue
                if len(pages) != 1 or not isinstance(pages[0].get("id"), str):
                    cleanup_failures.append(f"{record_type}:{record_id}: expected exactly one marked page")
                    continue
                notion.api.pages.update(page_id=pages[0]["id"], in_trash=True)
            except Exception as exc:
                cleanup_failures.append(f"{record_type}:{record_id}: {type(exc).__name__}")
        db.close()
        engine.dispose()
    return {
        "pass": first.get("pass") is True and second.get("pass") is True and not cleanup_failures,
        "first_sync": {
            "created": first.get("records_created", 0),
            "updated": first.get("records_updated", 0),
            "success": first.get("success", False),
        },
        "second_sync": {
            "created": second.get("records_created", 0),
            "updated": second.get("records_updated", 0),
            "success": second.get("success", False),
        },
        "sessions_tasks_risks_change_synced": bool(
            first.get("sessions_synced") == 1 and first.get("tasks_synced") == 1
            and first.get("risks_synced") == 1 and first.get("change_synced") is True
        ),
        "cleanup": "pass" if not cleanup_failures else cleanup_failures,
    }


def run_notion_setup(
    *,
    api: Any,
    parent_page_id: str,
    verify_write: bool = False,
    verify_sync: bool = False,
    persist: bool = True,
) -> dict[str, Any]:
    """Discover or create all databases, configure schemas, then run preflight."""
    if not parent_page_id.strip():
        raise NotionConfigurationError(
            "NOTION_PARENT_PAGE_ID is required. Share a parent page with the integration and set its page ID."
        )
    try:
        api.users.me()
    except Exception as exc:
        raise NotionClient._api_error(exc) from exc
    backend_options = _current_backend_select_options()
    database_ids: dict[str, str] = {}
    database_status: dict[str, str] = {}
    for record_type, title in DATABASE_TITLES.items():
        matches = _search_databases(api, title, parent_page_id)
        if len(matches) > 1:
            raise NotionConfigurationError(
                f"Found {len(matches)} exact {title} databases under the parent page. Resolve duplicates before setup."
            )
        if matches:
            database_id = matches[0]["id"]
            database_status[record_type] = "reused"
        else:
            created = _create_database(api, parent_page_id, record_type, backend_options)
            database_id = created.get("id") if isinstance(created, dict) else None
            if not isinstance(database_id, str) or not database_id:
                raise NotionConfigurationError(f"Notion did not return an ID for the {title} database.")
            database_status[record_type] = "created"
        database_ids[record_type] = database_id

    settings = NotionSettings(
        api_key=config.NOTION_API_KEY,
        sessions_database_id=database_ids["sessions"],
        tasks_database_id=database_ids["tasks"],
        risks_database_id=database_ids["risks"],
        changes_database_id=database_ids["changes"],
    )
    notion = NotionClient(settings, api=api)
    schema_status = {}
    for record_type in DATABASES:
        _ensure_schema(api, notion, record_type, backend_options)
        schema_status[record_type] = "pass"

    preflight = run_notion_preflight(
        notion,
        verify_write_permissions=verify_write or verify_sync,
        backend_select_options=backend_options,
    )
    if persist:
        _persist_database_ids(parent_page_id, database_ids)

    sync_status: dict[str, Any] = {"pass": False, "status": "not_requested"}
    if verify_sync and preflight.ready:
        sync_status = _run_real_sync_probe(notion)
    return {
        "api_version": NOTION_VERSION,
        "authentication": "pass" if preflight.credentials_status == "pass" else "fail",
        "databases": database_status,
        "schemas": schema_status,
        "preflight": preflight.model_dump(),
        "write_test": "pass" if all(
            row.write_permission_status == "pass" for row in preflight.databases
        ) else "fail",
        "sync_test": sync_status,
        "database_ids": database_ids,
        "local_config_file": str(LOCAL_DATABASE_CONFIG) if persist else None,
        "secret": "NOT DISPLAYED",
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create and validate the backend's four Notion databases."
    )
    parser.add_argument(
        "--verify-write", action="store_true",
        help="Create, update, verify, and trash temporary pages; use a staging workspace.",
    )
    parser.add_argument(
        "--verify-sync", action="store_true",
        help="Run the real sync service twice with throwaway in-memory backend data and trash only its marked pages.",
    )
    arguments = parser.parse_args()
    if not config.NOTION_API_KEY:
        print(json.dumps({
            "pass": False,
            "error": "NOTION_API_KEY is missing from the backend process environment.",
            "secret": "NOT DISPLAYED",
        }, indent=2))
        return 1
    if not config.NOTION_PARENT_PAGE_ID:
        print(json.dumps({
            "pass": False,
            "error": (
                "NOTION_PARENT_PAGE_ID is missing. Set it to the page ID where the integration "
                "has access; the connection must be shared on that parent page."
            ),
            "secret": "NOT DISPLAYED",
        }, indent=2))
        return 1
    api = create_notion_api(config.NOTION_API_KEY)
    try:
        result = run_notion_setup(
            api=api,
            parent_page_id=config.NOTION_PARENT_PAGE_ID,
            verify_write=arguments.verify_write,
            verify_sync=arguments.verify_sync,
        )
    except Exception as exc:
        if isinstance(exc, (NotionAPIError, NotionConfigurationError)):
            message = str(exc)
        else:
            message = str(NotionClient._api_error(exc))
        print(json.dumps({"pass": False, "error": message, "secret": "NOT DISPLAYED"}, indent=2))
        return 1
    finally:
        close = getattr(api, "close", None)
        if callable(close):
            close()
    print(json.dumps(result, indent=2))
    ready = result["preflight"].get("ready") is True
    if arguments.verify_sync:
        ready = ready and result["sync_test"].get("pass") is True
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
