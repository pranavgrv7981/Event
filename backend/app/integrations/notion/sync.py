"""One-way operational record upserts from verified backend state to Notion."""

import logging
from typing import Any
from collections.abc import Callable

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.integrations.notion.client import (
    NotionAPIError,
    NotionConfigurationError,
    NotionDuplicatePageError,
    NotionMalformedPageError,
    NotionClient,
    NotionSettings,
)
from app.integrations.notion.mapper import (
    map_change,
    map_change_request,
    map_risk,
    map_session,
    map_task,
)
from app.models import Change, ChangeRequest, Risk, Session as EventSession, Task
from app.schemas import AIImpactAnalysisResponse, VerifiedImpactResponse
from app.services.ai_impact_service import analyze_verified_impact
from app.services.risk_service import list_risks_for_change
from app.services.task_service import list_tasks_for_change

logger = logging.getLogger(__name__)


class NotionSyncFailure(BaseModel):
    record_type: str
    record_id: str | None = None
    error: str
    category: str = "record_error"
    status_code: int | None = None
    duplicate_matches: int | None = None


class NotionSyncResult(BaseModel):
    change_id: str
    success: bool
    change_synced: bool = False
    sessions_synced: int = 0
    tasks_synced: int = 0
    risks_synced: int = 0
    ai_recommended_actions_synced: int = 0
    analysis_provider: str | None = None
    records_created: int = 0
    records_updated: int = 0
    failures: list[NotionSyncFailure] = Field(default_factory=list)


def build_notion_client() -> NotionClient:
    settings = NotionSettings.from_environment()
    settings.validate()
    return NotionClient(settings)


def _failure(record_type: str, record_id: str | None, exc: Exception) -> NotionSyncFailure:
    if isinstance(exc, NotionAPIError):
        message = str(exc)
        category = exc.category
        status_code = exc.status_code
        duplicate_matches = None
    elif isinstance(exc, NotionConfigurationError):
        message = str(exc)
        category = "configuration"
        status_code = None
        duplicate_matches = None
    elif isinstance(exc, NotionDuplicatePageError):
        message = str(exc)
        category = "duplicate_match"
        status_code = None
        duplicate_matches = exc.match_count
    elif isinstance(exc, NotionMalformedPageError):
        message = str(exc)
        category = "malformed_page"
        status_code = None
        duplicate_matches = None
    else:
        message = f"Unexpected {type(exc).__name__}"
        category = "record_error"
        status_code = None
        duplicate_matches = None
    return NotionSyncFailure(
        record_type=record_type,
        record_id=record_id,
        error=message,
        category=category,
        status_code=status_code,
        duplicate_matches=duplicate_matches,
    )


def _sync_record(
    notion: NotionClient,
    *,
    record_type: str,
    record_id: str,
    properties: dict[str, Any],
) -> str:
    return notion.upsert_page(
        record_type=record_type, record_id=record_id, properties=properties
    )


def sync_change_to_notion(
    db: Session,
    change: Change,
    verified: VerifiedImpactResponse,
    *,
    notion_client: NotionClient | None = None,
    analysis_function: Callable[[VerifiedImpactResponse], AIImpactAnalysisResponse] | None = None,
    change_request: ChangeRequest | None = None,
) -> NotionSyncResult:
    """Upsert relevant backend records; Notion is never read as an authority."""
    try:
        notion = notion_client or build_notion_client()
    except (NotionConfigurationError, NotionAPIError) as exc:
        return NotionSyncResult(
            change_id=change.id,
            success=False,
            failures=[_failure("configuration", None, exc)],
        )

    failures: list[NotionSyncFailure] = []
    analysis: AIImpactAnalysisResponse | None = None
    try:
        analysis = (analysis_function or analyze_verified_impact)(verified)
    except Exception as exc:
        logger.warning("Notion sync AI analysis unavailable for change %s (%s)", change.id, type(exc).__name__)
        failures.append(_failure("ai_analysis", change.id, exc))

    session_ids = {item.id for item in verified.affected.sessions}
    if change.entity_type == "session":
        session_ids.add(change.entity_id)
    sessions: list[EventSession] = []
    if session_ids:
        try:
            sessions = list(
                db.scalars(
                    select(EventSession)
                    .where(EventSession.event_id == change.event_id, EventSession.id.in_(session_ids))
                    .options(
                        selectinload(EventSession.venue),
                        selectinload(EventSession.speakers),
                    )
                    .order_by(EventSession.id)
                ).all()
            )
        except Exception as exc:
            failures.append(_failure("sessions", None, exc))

    try:
        tasks = list_tasks_for_change(db, verified)
    except Exception as exc:
        tasks = []
        failures.append(_failure("tasks", None, exc))
    try:
        risks = list_risks_for_change(db, verified)
    except Exception as exc:
        risks = []
        failures.append(_failure("risks", None, exc))

    result = NotionSyncResult(change_id=change.id, success=False, failures=failures)
    for record_type, records, mapper, counter in (
        ("sessions", sessions, map_session, "sessions_synced"),
        ("tasks", tasks, map_task, "tasks_synced"),
        ("risks", risks, map_risk, "risks_synced"),
    ):
        for record in records:
            try:
                operation = _sync_record(
                    notion,
                    record_type=record_type,
                    record_id=record.id,
                    properties=mapper(record),
                )
                setattr(result, counter, getattr(result, counter) + 1)
                result.records_created += operation == "created"
                result.records_updated += operation == "updated"
            except Exception as exc:
                failures.append(_failure(record_type, record.id, exc))

    try:
        operation = _sync_record(
            notion,
            record_type="changes",
            record_id=change.id,
            properties=map_change(change, verified, analysis, change_request),
        )
        result.change_synced = True
        result.records_created += operation == "created"
        result.records_updated += operation == "updated"
        result.ai_recommended_actions_synced = (
            len(analysis.analysis.recommended_actions) if analysis else 0
        )
        result.analysis_provider = analysis.provider if analysis else None
    except Exception as exc:
        failures.append(_failure("changes", change.id, exc))
    result.failures = failures
    result.success = not failures
    return result


def sync_change_request_to_notion(
    change_request: ChangeRequest,
    *,
    notion_client: NotionClient | None = None,
) -> NotionSyncResult:
    """Upsert a rejected request to the shared Changes database without applying it."""
    try:
        notion = notion_client or build_notion_client()
        operation = _sync_record(
            notion,
            record_type="changes",
            record_id=change_request.id,
            properties=map_change_request(change_request),
        )
        return NotionSyncResult(
            change_id=change_request.id,
            success=True,
            change_synced=True,
            records_created=int(operation == "created"),
            records_updated=int(operation == "updated"),
        )
    except Exception as exc:
        return NotionSyncResult(
            change_id=change_request.id,
            success=False,
            failures=[_failure("changes", change_request.id, exc)],
        )
