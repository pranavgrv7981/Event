"""Validated wrapper around the Notion Python SDK."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app import config
from app.integrations.notion.databases import DATABASES

NOTION_VERSION = "2025-09-03"


class NotionConfigurationError(ValueError):
    """Raised when the optional Notion integration is not configured correctly."""


class NotionAPIError(RuntimeError):
    """Raised when a Notion API request fails."""


@dataclass(frozen=True)
class NotionSettings:
    api_key: str
    sessions_database_id: str
    tasks_database_id: str
    risks_database_id: str
    changes_database_id: str

    @classmethod
    def from_environment(cls) -> "NotionSettings":
        return cls(
            api_key=config.NOTION_API_KEY,
            sessions_database_id=config.NOTION_SESSIONS_DATABASE_ID,
            tasks_database_id=config.NOTION_TASKS_DATABASE_ID,
            risks_database_id=config.NOTION_RISKS_DATABASE_ID,
            changes_database_id=config.NOTION_CHANGES_DATABASE_ID,
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


class NotionClient:
    """Queries and upserts pages without exposing SDK details to sync logic."""

    def __init__(self, settings: NotionSettings, api: Any | None = None) -> None:
        settings.validate()
        self.settings = settings
        if api is None:
            from notion_client import Client

            api = Client(auth=settings.api_key, notion_version=NOTION_VERSION)
        self.api = api
        self._data_source_ids: dict[str, str] = {}

    def _resolve_data_source(self, database_id: str) -> str:
        if database_id in self._data_source_ids:
            return self._data_source_ids[database_id]
        try:
            database = self.api.databases.retrieve(database_id=database_id)
            data_sources = database.get("data_sources", [])
            if len(data_sources) != 1:
                raise NotionConfigurationError(
                    "Each configured Notion database must contain exactly one data source"
                )
            data_source_id = data_sources[0].get("id")
            if not data_source_id:
                raise NotionConfigurationError(
                    "Configured Notion database has no usable data source"
                )
            self._data_source_ids[database_id] = data_source_id
            return data_source_id
        except NotionConfigurationError:
            raise
        except Exception as exc:
            raise self._api_error(exc) from exc

    @staticmethod
    def _api_error(exc: Exception) -> NotionAPIError:
        code = getattr(exc, "code", None)
        detail = f" ({code})" if code else ""
        return NotionAPIError(f"Notion API request failed{detail}: {type(exc).__name__}")

    def query_database(
        self, database_id: str, *, filter: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        data_source_id = self._resolve_data_source(database_id)
        pages: list[dict[str, Any]] = []
        cursor: str | None = None
        try:
            while True:
                arguments: dict[str, Any] = {"data_source_id": data_source_id, "page_size": 100}
                if filter is not None:
                    arguments["filter"] = filter
                if cursor:
                    arguments["start_cursor"] = cursor
                response = self.api.data_sources.query(**arguments)
                pages.extend(response.get("results", []))
                if not response.get("has_more"):
                    return pages
                cursor = response.get("next_cursor")
                if not cursor:
                    raise NotionAPIError("Notion query indicated more pages without a cursor")
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
            if matches:
                self.api.pages.update(page_id=matches[0]["id"], properties=properties)
                return "updated"
            data_source_id = self._resolve_data_source(database_id)
            self.api.pages.create(
                parent={"type": "data_source_id", "data_source_id": data_source_id},
                properties=properties,
            )
            return "created"
        except Exception as exc:
            if isinstance(exc, NotionAPIError):
                raise
            raise self._api_error(exc) from exc
