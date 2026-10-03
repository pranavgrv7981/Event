"""Map source-of-truth backend records to Notion database properties."""

from datetime import date, datetime
from typing import Any

from app.models import Change, ChangeRequest, Risk, Session as EventSession, Task
from app.schemas import AIImpactAnalysisResponse, VerifiedImpactResponse


def _text(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)[:2000]


def _rich_text(value: object | None) -> dict[str, Any]:
    text = _text(value)
    return {"rich_text": [{"text": {"content": text}}] if text else []}


def _title(value: str) -> dict[str, Any]:
    return {"title": [{"text": {"content": value[:2000]}}]}


def _select(value: str | None) -> dict[str, Any]:
    return {"select": {"name": value}} if value else {"select": None}


def _date(value: date | datetime | None) -> dict[str, Any]:
    return {"date": {"start": value.isoformat()}} if value else {"date": None}


def map_session(session: EventSession) -> dict[str, Any]:
    return {
        "Name": _title(session.title),
        "Session ID": _rich_text(session.id),
        "Venue": _rich_text(session.venue.name if session.venue else None),
        "Start Time": _date(session.start_time),
        "End Time": _date(session.end_time),
        "Speaker": _rich_text(", ".join(person.name for person in session.speakers)),
        "Status": _select(session.status),
    }


def map_task(task: Task) -> dict[str, Any]:
    return {
        "Title": _title(task.title),
        "Task ID": _rich_text(task.id),
        "Status": _select(task.status),
        "Priority": _select(task.priority),
        "Owner": _rich_text(task.assigned_volunteer.name if task.assigned_volunteer else None),
        "Due Time": _date(task.due_time),
        "Description": _rich_text(task.description),
        "Source Change": _rich_text(task.source_change_id),
    }


def map_risk(risk: Risk) -> dict[str, Any]:
    return {
        "Title": _title(risk.title),
        "Risk ID": _rich_text(risk.id),
        "Severity": _select(risk.severity),
        "Status": _select(risk.status),
        "Description": _rich_text(risk.description),
        "Source Change": _rich_text(risk.source_change_id),
    }


def map_change(
    change: Change,
    verified: VerifiedImpactResponse,
    analysis: AIImpactAnalysisResponse | None,
    change_request: ChangeRequest | None = None,
) -> dict[str, Any]:
    actions = analysis.analysis.recommended_actions if analysis else []
    affected = verified.affected
    affected_text = "\n".join(
        f"{label}: {', '.join(items)}" for label, items in (
            ("Sessions", [item.id for item in affected.sessions]),
            ("Speakers", [item.id for item in affected.speakers]),
            ("Volunteers", [item.id for item in affected.volunteers]),
            ("Equipment", [item.id for item in affected.equipment]),
        ) if items
    )
    counts = verified.impact.counts
    impact_summary = (
        f"Severity: {verified.impact.severity}; "
        f"sessions={counts.sessions}, speakers={counts.speakers}, "
        f"volunteers={counts.volunteers}, equipment={counts.equipment}, "
        f"tasks={counts.tasks}, risks={counts.risks}"
    )
    conflicts = "\n".join(
        f"{item.severity}: {item.type} ({', '.join(item.entity_ids)}) - {item.message}"
        for item in verified.conflicts
    )
    return {
        "Title": _title(f"{change.entity_type}: {change.field_name}"),
        "Change ID": _rich_text(change.id),
        "Entity": _rich_text(f"{change.entity_type}/{change.entity_id}"),
        "Field": _rich_text(change.field_name),
        "Old Value": _rich_text(change.old_value),
        "New Value": _rich_text(change.new_value),
        "Status": _select("Recorded"),
        "Severity": _select(verified.impact.severity),
        "Created Time": _date(change.created_at),
        "AI Recommended Actions": _rich_text("\n".join(actions)),
        "Request Status": _rich_text(change_request.status if change_request else None),
        "Reason": _rich_text(change_request.reason if change_request else change.reason),
        "Requester": _rich_text(
            change_request.created_by if change_request else change.created_by
        ),
        "Affected Entities": _rich_text(affected_text),
        "Impact Summary": _rich_text(impact_summary),
        "Conflicts": _rich_text(conflicts),
    }


def map_change_request(change_request: ChangeRequest) -> dict[str, Any]:
    """Map a request that was not applied into the shared Changes database."""
    return {
        "Title": _title(f"{change_request.entity_type}: {change_request.field_name}"),
        "Change ID": _rich_text(change_request.id),
        "Entity": _rich_text(f"{change_request.entity_type}/{change_request.entity_id}"),
        "Field": _rich_text(change_request.field_name),
        "Old Value": _rich_text(change_request.old_value),
        "New Value": _rich_text(change_request.new_value),
        "Status": _select("Recorded"),
        "Severity": _select(None),
        "Created Time": _date(change_request.created_at),
        "AI Recommended Actions": _rich_text(None),
        "Request Status": _rich_text(change_request.status),
        "Reason": _rich_text(change_request.reason),
        "Requester": _rich_text(change_request.created_by),
        "Affected Entities": _rich_text(None),
        "Impact Summary": _rich_text("Not applied: request was rejected; no event impact was generated."),
        "Conflicts": _rich_text(None),
    }
