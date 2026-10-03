"""Validated wrapper around the Notion Python SDK."""

from __future__ import annotations

from dataclasses import dataclass
import logging
import json
from pathlib import Path
import re
from typing import Any

from app import config
from app.integrations.notion.databases import DATABASES

NOTION_VERSION = "2025-09-03"
LOCAL_DATABASE_CONFIG = Path(__file__).resolve().parents[3] / ".notion-databases.json"


class NotionConfigurationError(ValueError):
    """Raised when the optional Notion integration is not configured correctly."""


class NotionAPIError(RuntimeError):
    """Safe, actionable API failure metadata without raw server or request content."""

    def __init__(
        self,
        message: str,
        *,
        category: str = "api_error",
        code: str | None = None,
        status_code: int | None = None,
    ) -> None:
        super().__init__(message)
        self.category = category
        self.code = code
        self.status_code = status_code


class NotionDuplicatePageError(RuntimeError):
    """Raised when a backend ID already matches multiple active Notion pages."""

    def __init__(self, record_type: str, record_id: str, match_count: int) -> None:
        super().__init__(
            f"{record_type} backend ID {record_id} matches {match_count} Notion pages; "
            "no page was updated. Resolve the duplicate pages, then retry."
        )
        self.record_type = record_type
        self.record_id = record_id
        self.match_count = match_count


class NotionMalformedPageError(RuntimeError):
    """Raised when a matching Notion page cannot safely be updated."""


@dataclass(frozen=True)
class NotionSettings:
    api_key: str
    sessions_database_id: str
    tasks_database_id: str
    risks_database_id: str
    changes_database_id: str

    @classmethod
    def from_environment(cls) -> "NotionSettings":
        local_ids = _load_local_database_ids()
        return cls(
            api_key=config.NOTION_API_KEY,
            sessions_database_id=config.NOTION_SESSIONS_DATABASE_ID or local_ids.get("sessions", ""),
            tasks_database_id=config.NOTION_TASKS_DATABASE_ID or local_ids.get("tasks", ""),
            risks_database_id=config.NOTION_RISKS_DATABASE_ID or local_ids.get("risks", ""),
            changes_database_id=config.NOTION_CHANGES_DATABASE_ID or local_ids.get("changes", ""),
        )

    def validate(self) -> None:
        values = {
            "NOTION_API_KEY": self.api_key,
            "NOTION_SESSIONS_DATABASE_ID": self.sessions_database_id,
            "NOTION_TASKS_DATABASE_ID": self.tasks_database_id,
            "NOTION_RISKS_DATABASE_ID": self.risks_database_id,
            "NOTION_CHANGES_DATABASE_ID": self.changes_database_id,
        }
        missing = [name for name, value in values.items() if not value.strip()]
        if missing:
            raise NotionConfigurationError(
                "Missing Notion configuration: " + ", ".join(missing)
            )
        database_ids = [
            self.sessions_database_id,
            self.tasks_database_id,
            self.risks_database_id,
            self.changes_database_id,
        ]
        if len(set(database_ids)) != len(database_ids):
            raise NotionConfigurationError(
                "Each Notion record type must use a distinct database ID"
            )

    def database_id(self, record_type: str) -> str:
        self.validate()
        definition = DATABASES.get(record_type)
        if definition is None:
            raise NotionConfigurationError(f"Unsupported Notion record type: {record_type}")
        return getattr(self, definition.config_attribute.lower())


def _load_local_database_ids() -> dict[str, str]:
    """Load generated non-secret IDs; credentials are never read from this file."""
    try:
        contents = json.loads(LOCAL_DATABASE_CONFIG.read_text(encoding="utf-8"))
        database_ids = contents.get("database_ids", {}) if isinstance(contents, dict) else {}
        if not isinstance(database_ids, dict):
            return {}
        return {
            key: value
            for key, value in database_ids.items()
            if key in {"sessions", "tasks", "risks", "changes"}
            and isinstance(value, str)
            and value.strip()
        }
    except (OSError, json.JSONDecodeError):
        return {}


def create_notion_api(api_key: str) -> Any:
    """Construct the official SDK client with the integration's pinned API behavior."""
    from notion_client import Client
    from notion_client.client import RetryOptions

    return Client(
        auth=api_key,
        notion_version=NOTION_VERSION,
        log_level=logging.CRITICAL,
        timeout_ms=15_000,
        retry=RetryOptions(
            max_retries=3,
            initial_retry_delay_ms=500,
            max_retry_delay_ms=8_000,
        ),
    )


class NotionClient:
    """Queries and upserts pages without exposing SDK details to sync logic."""

    def __init__(self, settings: NotionSettings, api: Any | None = None) -> None:
        settings.validate()
        self.settings = settings
        self.api = api if api is not None else create_notion_api(settings.api_key)
        self._data_source_ids: dict[str, str] = {}

    def _resolve_data_source(self, database_id: str) -> str:
        if database_id in self._data_source_ids:
            return self._data_source_ids[database_id]
        try:
            record_type = next(
                name for name in DATABASES
                if self.settings.database_id(name) == database_id
            )
            data_source_id = self.inspect_database(record_type)["data_source_id"]
            self._data_source_ids[database_id] = data_source_id
            return data_source_id
        except NotionConfigurationError:
            raise
        except Exception as exc:
            raise self._api_error(exc) from exc

    @staticmethod
    def _api_error(exc: Exception) -> NotionAPIError:
        if isinstance(exc, NotionAPIError):
            return exc
        raw_code = getattr(exc, "code", None)
        code = raw_code if isinstance(raw_code, str) and re.fullmatch(r"[a-z0-9_]+", raw_code) else None
        raw_status = getattr(exc, "status", getattr(exc, "status_code", None))
        status_code = raw_status if isinstance(raw_status, int) else None
        name = type(exc).__name__
        if status_code == 401 or code == "unauthorized":
            category, message = "credentials", "Notion rejected the integration credentials. Verify the token."
        elif status_code == 403 or code == "restricted_resource":
            category, message = "permission", "Notion denied access. Check database sharing and integration capabilities."
        elif status_code == 404 or code == "object_not_found":
            category, message = "not_found", "Notion could not find the object or it is not shared with this integration."
        elif status_code == 429 or code == "rate_limited":
            category, message = "rate_limit", "Notion rate limited the request after SDK retries. Retry later."
        elif status_code == 400 or code in {"validation_error", "invalid_json"}:
            category, message = "validation", "Notion rejected the request. Check database property names and types."
        elif status_code in {408, 504} or "Timeout" in name:
            category, message = "network", "The Notion API request timed out. Retry after checking connectivity."
        elif status_code is not None and status_code >= 500:
            category, message = "api_unavailable", "The Notion API is temporarily unavailable. Retry later."
        else:
            category, message = "network", "The Notion API request failed. Check connectivity and SDK diagnostics."
        return NotionAPIError(
            message,
            category=category,
            code=code,
            status_code=status_code,
        )

    def inspect_database(self, record_type: str) -> dict[str, Any]:
        """Fetch the configured database and its sole data source for preflight."""
        definition = DATABASES.get(record_type)
        if definition is None:
            raise NotionConfigurationError(f"Unsupported Notion record type: {record_type}")
        database_id = self.settings.database_id(record_type)
        try:
            database = self.api.databases.retrieve(database_id=database_id)
            data_sources = database.get("data_sources", [])
            if not isinstance(data_sources, list) or not data_sources:
                raise NotionConfigurationError(
                    f"{record_type.title()} database has no data source; verify the database ID"
                )
            active_sources = []
            for source in data_sources:
                data_source_id = source.get("id") if isinstance(source, dict) else None
                if not isinstance(data_source_id, str) or not data_source_id:
                    raise NotionConfigurationError(
                        f"{record_type.title()} database returned an invalid data-source ID"
                    )
                data_source = self.api.data_sources.retrieve(data_source_id=data_source_id)
                if not data_source.get("archived") and not data_source.get("in_trash"):
                    active_sources.append((data_source_id, data_source))
            if not active_sources:
                raise NotionConfigurationError(
                    f"{record_type.title()} database has no active data source"
                )
            if len(active_sources) != 1:
                raise NotionConfigurationError(
                    f"{record_type.title()} database has {len(active_sources)} active data sources; exactly one is supported"
                )
            data_source_id, data_source = active_sources[0]
            return {
                "database_id": database_id,
                "database": database,
                "data_source_id": data_source_id,
                "data_source": data_source,
            }
        except (NotionAPIError, NotionConfigurationError):
            raise
        except Exception as exc:
            raise self._api_error(exc) from exc

    def query_database(
        self, database_id: str, *, filter: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        data_source_id = self._resolve_data_source(database_id)
        pages: list[dict[str, Any]] = []
        cursor: str | None = None
        seen_cursors: set[str] = set()
        try:
            while True:
                arguments: dict[str, Any] = {"data_source_id": data_source_id, "page_size": 100}
                if filter is not None:
                    arguments["filter"] = filter
                if cursor:
                    arguments["start_cursor"] = cursor
                response = self.api.data_sources.query(**arguments)
                if not isinstance(response, dict) or not isinstance(response.get("results"), list):
                    raise NotionAPIError(
                        "Notion query returned a malformed page list.",
                        category="malformed_response",
                    )
                pages.extend(response["results"])
                if not response.get("has_more"):
                    return pages
                cursor = response.get("next_cursor")
                if not cursor:
                    raise NotionAPIError("Notion query indicated more pages without a cursor")
                if not isinstance(cursor, str) or cursor in seen_cursors:
                    raise NotionAPIError(
                        "Notion query returned a repeated pagination cursor.",
                        category="malformed_response",
                    )
                seen_cursors.add(cursor)
        except NotionAPIError:
            raise
        except Exception as exc:
            raise self._api_error(exc) from exc

    def upsert_page(
        self,
        *,
        record_type: str,
        record_id: str,
        properties: dict[str, Any],
    ) -> str:
        definition = DATABASES.get(record_type)
        if definition is None:
            raise NotionConfigurationError(f"Unsupported Notion record type: {record_type}")
        database_id = self.settings.database_id(record_type)
        identity_filter = {
            "property": definition.identity_property,
            "rich_text": {"equals": record_id},
        }
        matches = self.query_database(database_id, filter=identity_filter)
        try:
            if len(matches) > 1:
                raise NotionDuplicatePageError(record_type, record_id, len(matches))
            if matches:
                page = matches[0]
                if not isinstance(page, dict):
                    raise NotionMalformedPageError(
                        f"Matching {record_type} record for backend ID {record_id} is not a page object"
                    )
                page_id = page.get("id")
                if not isinstance(page_id, str) or not page_id:
                    raise NotionMalformedPageError(
                        f"Matching {record_type} page for backend ID {record_id} has no usable Notion page ID"
                    )
                identity = page.get("properties", {}).get(definition.identity_property)
                identity_parts = identity.get("rich_text") if isinstance(identity, dict) else None
                actual_id = "".join(
                    part.get("plain_text") or part.get("text", {}).get("content", "")
                    for part in identity_parts or []
                    if isinstance(part, dict)
                )
                if actual_id != record_id:
                    raise NotionMalformedPageError(
                        f"Matching {record_type} page {page_id} has a missing or inconsistent backend ID"
                    )
                self.api.pages.update(page_id=page_id, properties=properties)
                return "updated"
            data_source_id = self._resolve_data_source(database_id)
            self.api.pages.create(
                parent={"type": "data_source_id", "data_source_id": data_source_id},
                properties=properties,
            )
            return "created"
        except Exception as exc:
            if isinstance(exc, (NotionAPIError, NotionDuplicatePageError, NotionMalformedPageError)):
                raise
            raise self._api_error(exc) from exc
