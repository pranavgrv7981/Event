"""One-way operational record upserts from verified backend state to Notion."""

import logging
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.integrations.notion.client import (
    NotionAPIError,
    NotionConfigurationError,
    NotionClient,
    NotionSettings,
)
from app.integrations.notion.mapper import map_change, map_risk, map_session, map_task
from app.models import Change, Risk, Session as EventSession, Task
from app.schemas import AIImpactAnalysisResponse, VerifiedImpactResponse
from app.services.ai_impact_service import analyze_verified_impact
from app.services.risk_service import list_risks_for_change
from app.services.task_service import list_tasks_for_change

logger = logging.getLogger(__name__)


class NotionSyncFailure(BaseModel):
    record_type: str
    record_id: str | None = None
    error: str


class NotionSyncResult(BaseModel):
    change_id: str
    success: bool
    change_synced: bool = False
    sessions_synced: int = 0
    tasks_synced: int = 0
    risks_synced: int = 0
    ai_recommended_actions_synced: int = 0
    analysis_provider: str | None = None
    failures: list[NotionSyncFailure] = Field(default_factory=list)


def build_notion_client() -> NotionClient:
    settings = NotionSettings.from_environment()
    settings.validate()
    return NotionClient(settings)


def _failure(record_type: str, record_id: str | None, exc: Exception) -> NotionSyncFailure:
    if isinstance(exc, (NotionAPIError, NotionConfigurationError)):
        message = str(exc)
    else:
        message = f"Unexpected {type(exc).__name__}"
    return NotionSyncFailure(record_type=record_type, record_id=record_id, error=message)


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
        analysis = analyze_verified_impact(verified)
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
                _sync_record(
                    notion,
                    record_type=record_type,
                    record_id=record.id,
                    properties=mapper(record),
                )
                setattr(result, counter, getattr(result, counter) + 1)
            except Exception as exc:
                failures.append(_failure(record_type, record.id, exc))

    try:
        _sync_record(
            notion,
            record_type="changes",
            record_id=change.id,
            properties=map_change(change, verified, analysis),
        )
        result.change_synced = True
        result.ai_recommended_actions_synced = (
            len(analysis.analysis.recommended_actions) if analysis else 0
        )
        result.analysis_provider = analysis.provider if analysis else None
    except Exception as exc:
        failures.append(_failure("changes", change.id, exc))
    result.failures = failures
    result.success = not failures
    return result
