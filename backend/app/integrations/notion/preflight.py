"""Live Notion configuration, access, and schema verification."""

from __future__ import annotations

import argparse
import json
import logging
from uuid import uuid4

from pydantic import BaseModel, Field

from app.integrations.notion.client import (
    NOTION_VERSION,
    NotionAPIError,
    NotionClient,
    NotionConfigurationError,
    NotionSettings,
)
from app.integrations.notion.databases import DATABASES

logger = logging.getLogger(__name__)


class PreflightDiagnostic(BaseModel):
    code: str
    message: str


class DatabasePreflight(BaseModel):
    record_type: str
    status: str = "fail"
    data_source_status: str = "not_checked"
    schema_status: str = "not_checked"
    read_permission_status: str = "not_checked"
    write_permission_status: str = "not_checked"
    diagnostics: list[PreflightDiagnostic] = Field(default_factory=list)


class NotionPreflightResult(BaseModel):
    api_version: str = NOTION_VERSION
    ready: bool = False
    credentials_status: str = "not_checked"
    write_permissions_probed: bool = False
    diagnostics: list[PreflightDiagnostic] = Field(default_factory=list)
    databases: list[DatabasePreflight] = Field(default_factory=list)


def _api_diagnostic(exc: Exception) -> PreflightDiagnostic:
    if isinstance(exc, NotionAPIError):
        return PreflightDiagnostic(code=exc.category, message=str(exc))
    if isinstance(exc, NotionConfigurationError):
        return PreflightDiagnostic(code="configuration", message=str(exc))
    return PreflightDiagnostic(
        code="unexpected_error",
        message=f"Unexpected {type(exc).__name__}; inspect backend logs for the sanitized diagnostic.",
    )


def _validate_schema(
    record_type: str,
    properties: object,
    backend_select_options: dict[str, dict[str, set[str]]] | None = None,
) -> list[PreflightDiagnostic]:
    definition = DATABASES[record_type]
    if not isinstance(properties, dict):
        return [PreflightDiagnostic(code="invalid_schema", message="Data source did not return a property schema.")]

    diagnostics: list[PreflightDiagnostic] = []
    for name, expected in definition.properties.items():
        actual = properties.get(name)
        if not isinstance(actual, dict):
            diagnostics.append(
                PreflightDiagnostic(
                    code="missing_property",
                    message=f"Missing required property {name!r}.",
                )
            )
            continue
        actual_type = actual.get("type")
        if actual_type != expected.property_type:
            diagnostics.append(
                PreflightDiagnostic(
                    code="wrong_property_type",
                    message=f"Property {name!r} must be {expected.property_type}; found {actual_type or 'unknown'}.",
                )
            )
            continue
        if expected.property_type == "select" and expected.required_options:
            select = actual.get("select")
            options = select.get("options", []) if isinstance(select, dict) else []
            option_names = {
                option.get("name")
                for option in options
                if isinstance(option, dict) and isinstance(option.get("name"), str)
            }
            backend_options = (
                (backend_select_options or {}).get(record_type, {}).get(name, set())
            )
            missing_options = sorted((set(expected.required_options) | backend_options) - option_names)
            if missing_options:
                diagnostics.append(
                    PreflightDiagnostic(
                        code="missing_select_options",
                        message=(
                            f"Property {name!r} is missing backend values: "
                            + ", ".join(repr(option) for option in missing_options)
                            + "."
                        ),
                    )
                )
    return diagnostics


def _write_probe(notion: NotionClient, record_type: str, data_source_id: str) -> list[PreflightDiagnostic]:
    definition = DATABASES[record_type]
    marker = f"__event_ops_preflight__{uuid4().hex}"
    properties = {
        definition.title_property: {"title": [{"text": {"content": marker}}]},
        definition.identity_property: {"rich_text": [{"text": {"content": marker}}]},
    }
    page_id: str | None = None
    diagnostics: list[PreflightDiagnostic] = []
    try:
        page = notion.api.pages.create(
            parent={"type": "data_source_id", "data_source_id": data_source_id},
            properties=properties,
        )
        page_id = page.get("id") if isinstance(page, dict) else None
        if not isinstance(page_id, str) or not page_id:
            raise RuntimeError("Notion did not return a page ID for the write-permission probe")
        notion.api.pages.update(page_id=page_id, properties=properties)
    except Exception as exc:
        diagnostics.append(_api_diagnostic(notion._api_error(exc)))
    finally:
        if page_id:
            try:
                notion.api.pages.update(page_id=page_id, in_trash=True)
            except Exception as exc:
                diagnostics.append(
                    PreflightDiagnostic(
                        code="probe_cleanup_failed",
                        message=(
                            f"Could not trash temporary preflight page {page_id}; "
                            "manually move that marked page to trash in Notion."
                        ),
                    )
                )
                logger.warning(
                    "Notion preflight cleanup failed for record_type=%s page_id=%s error=%s",
                    record_type,
                    page_id,
                    type(exc).__name__,
                )
    return diagnostics


def run_notion_preflight(
    notion: NotionClient,
    *,
    verify_write_permissions: bool = False,
    backend_select_options: dict[str, dict[str, set[str]]] | None = None,
) -> NotionPreflightResult:
    """Validate credentials, access, one data source, schema, and optional writes."""
    result = NotionPreflightResult(write_permissions_probed=verify_write_permissions)
    try:
        notion.api.users.me()
        result.credentials_status = "pass"
    except Exception as exc:
        result.credentials_status = "fail"
        result.diagnostics.append(_api_diagnostic(notion._api_error(exc)))
        result.databases = [
            DatabasePreflight(
                record_type=record_type,
                diagnostics=[PreflightDiagnostic(
                    code="credentials_unavailable",
                    message="Database checks skipped because credentials were rejected.",
                )],
            )
            for record_type in DATABASES
        ]
        return result

    all_ready = True
    for record_type in DATABASES:
        check = DatabasePreflight(record_type=record_type)
        result.databases.append(check)
        try:
            inspected = notion.inspect_database(record_type)
            source = inspected["data_source"]
            data_source_id = inspected["data_source_id"]
            check.data_source_status = "pass"
        except Exception as exc:
            check.diagnostics.append(_api_diagnostic(exc))
            check.status = "fail"
            all_ready = False
            continue

        check.diagnostics.extend(
            _validate_schema(
                record_type,
                source.get("properties"),
                backend_select_options,
            )
        )
        check.schema_status = "pass" if not check.diagnostics else "fail"
        try:
            notion.api.data_sources.query(data_source_id=data_source_id, page_size=1)
            check.read_permission_status = "pass"
        except Exception as exc:
            check.read_permission_status = "fail"
            check.diagnostics.append(_api_diagnostic(notion._api_error(exc)))

        if check.schema_status == "pass" and check.read_permission_status == "pass":
            if verify_write_permissions:
                write_diagnostics = _write_probe(notion, record_type, data_source_id)
                check.diagnostics.extend(write_diagnostics)
                check.write_permission_status = "fail" if write_diagnostics else "pass"
            else:
                check.write_permission_status = "not_checked"
                check.diagnostics.append(
                    PreflightDiagnostic(
                        code="write_permission_not_checked",
                        message=(
                            "Notion does not expose insert/update capability metadata through a "
                            "read-only API call. Run preflight with --verify-write-permissions "
                            "against staging databases to verify writes."
                        ),
                    )
                )
        check.status = (
            "pass"
            if check.schema_status == "pass"
            and check.read_permission_status == "pass"
            and check.write_permission_status == "pass"
            else "fail"
        )
        all_ready = all_ready and check.status == "pass"

    result.ready = result.credentials_status == "pass" and all_ready
    return result


def preflight_from_environment(*, verify_write_permissions: bool = False) -> NotionPreflightResult:
    try:
        settings = NotionSettings.from_environment()
        settings.validate()
        notion = NotionClient(settings)
    except Exception as exc:
        return NotionPreflightResult(
            write_permissions_probed=verify_write_permissions,
            credentials_status="fail",
            diagnostics=[_api_diagnostic(exc)],
        )
    try:
        backend_select_options = _current_backend_select_options()
        return run_notion_preflight(
            notion,
            verify_write_permissions=verify_write_permissions,
            backend_select_options=backend_select_options,
        )
    except Exception as exc:
        return NotionPreflightResult(
            write_permissions_probed=verify_write_permissions,
            credentials_status="not_checked",
            diagnostics=[PreflightDiagnostic(
                code="backend_database_unavailable",
                message=(
                    "Could not read current backend select values to validate Notion options: "
                    f"{type(exc).__name__}. Ensure the backend database is initialized."
                ),
            )],
        )
    finally:
        close = getattr(notion.api, "close", None)
        if callable(close):
            close()


def _current_backend_select_options() -> dict[str, dict[str, set[str]]]:
    from sqlalchemy import select

    from app.database import SessionLocal
    from app.models import Risk, Session as EventSession, Task

    with SessionLocal() as db:
        return {
            "sessions": {"Status": set(db.scalars(select(EventSession.status).distinct()).all())},
            "tasks": {
                "Status": set(db.scalars(select(Task.status).distinct()).all()),
                "Priority": set(db.scalars(select(Task.priority).distinct()).all()),
            },
            "risks": {
                "Status": set(db.scalars(select(Risk.status).distinct()).all()),
                "Severity": set(db.scalars(select(Risk.severity).distinct()).all()),
            },
        }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the configured Notion sync integration.")
    parser.add_argument(
        "--verify-write-permissions",
        action="store_true",
        help="Create, update, then trash marked probe pages; use only with staging databases.",
    )
    arguments = parser.parse_args()
    result = preflight_from_environment(
        verify_write_permissions=arguments.verify_write_permissions
    )
    print(json.dumps(result.model_dump(), indent=2))
    return 0 if result.ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
