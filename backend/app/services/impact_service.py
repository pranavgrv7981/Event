"""Transactional change processing and deterministic impact summaries."""

import logging
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, inspect
from sqlalchemy.orm import Session

from app.models import Change, Equipment, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import (
    AffectedEntities,
    ChangeRead,
    ConflictItem,
    ImpactCounts,
    ImpactSummary,
    VerifiedImpactResponse,
)
from app.services.conflict_service import detect_conflicts
from app.services.dependency_engine import (
    ENTITY_MODELS,
    EntityNotFound,
    InvalidEntityIdentifier,
    UnsupportedEntityType,
    get_affected_entities,
)

logger = logging.getLogger(__name__)

CHANGEABLE_FIELDS = {
    "event": {"name", "description", "date", "start_time", "end_time", "status"},
    "venue": {"name", "location", "capacity", "status"},
    "session": {"title", "description", "start_time", "end_time", "status", "venue_id"},
    "speaker": {"name", "organization", "email", "title"},
    "volunteer": {"name", "email", "role", "availability"},
    "equipment": {"name", "category", "quantity", "status", "venue_id"},
    "task": {
        "title", "description", "status", "priority", "due_time",
        "assigned_volunteer_id", "session_id", "venue_id",
    },
    "risk": {"title", "description", "severity", "status", "venue_id", "session_id"},
}
RELATED_MODELS = {
    ("session", "venue_id"): Venue,
    ("equipment", "venue_id"): Venue,
    ("task", "venue_id"): Venue,
    ("risk", "venue_id"): Venue,
    ("task", "session_id"): EventSession,
    ("risk", "session_id"): EventSession,
    ("task", "assigned_volunteer_id"): Volunteer,
}


class EventNotFound(LookupError):
    """Raised when the requested parent event does not exist."""


class EntityOwnershipError(ValueError):
    """Raised when the target or a relationship belongs to another event."""


class UnsupportedChangeField(ValueError):
    """Raised when a field is not enabled for operational changes."""


class InvalidChangeValue(ValueError):
    """Raised when a proposed field value cannot be applied safely."""


class UnchangedValue(ValueError):
    """Raised when a change would not change the stored value."""


def _parse_value(target: object, field_name: str, value: object) -> object:
    column = inspect(type(target)).column_attrs[field_name].columns[0]
    python_type = column.type.python_type
    current_value = getattr(target, field_name)
    if value is None:
        if not column.nullable:
            raise InvalidChangeValue(f"{field_name} cannot be null")
        return None

    try:
        if python_type is datetime:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
        elif python_type is date:
            parsed = date.fromisoformat(value) if isinstance(value, str) else value
        elif python_type is bool:
            parsed = value if isinstance(value, bool) else None
        elif python_type is int:
            parsed = value if isinstance(value, int) and not isinstance(value, bool) else None
        elif python_type is float:
            parsed = float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None
        elif python_type is str:
            parsed = value if isinstance(value, str) else None
        else:
            parsed = value if isinstance(value, python_type) else None
    except (TypeError, ValueError, OverflowError) as exc:
        raise InvalidChangeValue(f"Invalid value for {field_name}") from exc

    if not isinstance(parsed, python_type) or (python_type is date and isinstance(parsed, datetime)):
        raise InvalidChangeValue(f"Invalid value for {field_name}")
    if isinstance(target, Task):
        allowed = {
            "status": {"open", "todo", "in_progress", "blocked", "done", "cancelled"},
            "priority": {"low", "medium", "high", "critical"},
        }.get(field_name)
        if allowed is not None and parsed not in allowed:
            raise InvalidChangeValue(f"Invalid task {field_name}")
    if isinstance(target, Risk):
        allowed = {
            "status": {"open", "monitoring", "mitigating", "mitigated", "closed"},
            "severity": {"low", "medium", "high", "critical"},
        }.get(field_name)
        if allowed is not None and parsed not in allowed:
            raise InvalidChangeValue(f"Invalid risk {field_name}")
    if isinstance(parsed, datetime) and isinstance(current_value, datetime):
        if (parsed.tzinfo is None) != (current_value.tzinfo is None):
            raise InvalidChangeValue(f"{field_name} must use the stored timezone format")
    if isinstance(parsed, str):
        if not parsed.strip():
            raise InvalidChangeValue(f"{field_name} cannot be empty")
        if getattr(column.type, "length", None) and len(parsed) > column.type.length:
            raise InvalidChangeValue(f"{field_name} exceeds its maximum length")
    if field_name in {"capacity", "quantity"} and parsed <= 0:
        raise InvalidChangeValue(f"{field_name} must be greater than zero")
    return parsed


def _serialize_value(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


def _validate_related_entity(
    db: Session, event_id: str, entity_type: str, field_name: str, value: object
) -> None:
    related_model = RELATED_MODELS.get((entity_type, field_name))
    if related_model is None or value is None:
        return
    related = db.get(related_model, value)
    if related is None:
        raise InvalidChangeValue(f"Related {field_name.removesuffix('_id')} was not found")
    if related.event_id != event_id:
        raise EntityOwnershipError("Related entity belongs to another event")


def _validate_time_range(target: object, field_name: str, value: object) -> None:
    if not isinstance(target, (Event, EventSession)) or field_name not in {"start_time", "end_time"}:
        return
    start_time = value if field_name == "start_time" else target.start_time
    end_time = value if field_name == "end_time" else target.end_time
    try:
        valid = start_time < end_time
    except TypeError as exc:
        raise InvalidChangeValue("Start and end times must use compatible time zones") from exc
    if not valid:
        raise InvalidChangeValue("End time must be later than start time")


def analyze_impact(affected: AffectedEntities, conflicts: list[ConflictItem]) -> ImpactSummary:
    """Derive severity and machine-readable reasons from verified counts and conflicts."""
    counts = ImpactCounts(
        sessions=len(affected.sessions),
        speakers=len(affected.speakers),
        volunteers=len(affected.volunteers),
        equipment=len(affected.equipment),
        tasks=len(affected.tasks),
        risks=len(affected.risks),
    )
    severities = {conflict.severity for conflict in conflicts}
    if "high" in severities:
        severity = "high"
    elif "medium" in severities or counts.tasks > 1:
        severity = "medium"
    else:
        severity = "low"

    reasons = sorted({f"conflict:{conflict.type}" for conflict in conflicts})
    if counts.tasks > 1:
        reasons.append("multiple_tasks_require_review")
    if not reasons:
        reasons.append("no_conflict_detected")
    return ImpactSummary(
        counts=counts,
        conflict_count=len(conflicts),
        severity=severity,
        reasons=reasons,
    )


def reconstruct_verified_impact(db: Session, change: Change) -> VerifiedImpactResponse:
    """Recompute a read-only impact snapshot for a recorded change using current records."""
    if change.entity_type not in ENTITY_MODELS:
        raise UnsupportedEntityType(change.entity_type)
    target = db.get(ENTITY_MODELS[change.entity_type], change.entity_id)
    if target is None:
        raise EntityNotFound(f"{change.entity_type}/{change.entity_id}")

    dependency_result = get_affected_entities(db, change.entity_type, change.entity_id)
    current_value = getattr(target, change.field_name, None)
    conflicts = detect_conflicts(
        db,
        event_id=change.event_id,
        entity_type=change.entity_type,
        entity=target,
        field_name=change.field_name,
        new_value=current_value,
    )
    return VerifiedImpactResponse(
        change_id=change.id,
        change=ChangeRead.model_validate(change),
        affected=dependency_result.affected,
        conflicts=conflicts,
        impact=analyze_impact(dependency_result.affected, conflicts),
    )


def process_change(
    db: Session,
    *,
    event_id: str,
    entity_type: str,
    entity_id: str,
    field_name: str,
    new_value: object,
    reason: str,
) -> VerifiedImpactResponse:
    """Validate, apply, record, and analyze one operational change atomically."""
    logger.info(
        "Operational change requested: event=%s target=%s/%s field=%s",
        event_id,
        entity_type,
        entity_id,
        field_name,
    )
    try:
        with db.begin():
            event = db.get(Event, event_id)
            if event is None:
                raise EventNotFound(event_id)
            if entity_type not in ENTITY_MODELS or entity_type == "change":
                raise UnsupportedEntityType(entity_type)
            if not entity_id or entity_id != entity_id.strip() or len(entity_id) > 64:
                raise InvalidEntityIdentifier(entity_id)
            if field_name not in CHANGEABLE_FIELDS[entity_type]:
                raise UnsupportedChangeField(field_name)

            target = db.get(ENTITY_MODELS[entity_type], entity_id)
            if target is None:
                raise EntityNotFound(f"{entity_type}/{entity_id}")
            if entity_type == "event":
                if target.id != event_id:
                    raise EntityOwnershipError("Target event does not match the route event")
            elif target.event_id != event_id:
                raise EntityOwnershipError("Target entity belongs to another event")

            parsed_value = _parse_value(target, field_name, new_value)
            old_value = getattr(target, field_name)
            if old_value == parsed_value:
                raise UnchangedValue("New value is the same as the current value")
            _validate_related_entity(db, event_id, entity_type, field_name, parsed_value)
            _validate_time_range(target, field_name, parsed_value)

            dependencies = get_affected_entities(db, entity_type, entity_id)
            conflicts = detect_conflicts(
                db,
                event_id=event_id,
                entity_type=entity_type,
                entity=target,
                field_name=field_name,
                new_value=parsed_value,
            )

            setattr(target, field_name, parsed_value)
            change = Change(
                id=f"change_{uuid4().hex}",
                event_id=event_id,
                entity_type=entity_type,
                entity_id=entity_id,
                field_name=field_name,
                old_value=_serialize_value(old_value),
                new_value=_serialize_value(parsed_value),
                reason=reason.strip(),
            )
            db.add(change)
            db.flush()
            impact = analyze_impact(dependencies.affected, conflicts)
            result = VerifiedImpactResponse(
                change_id=change.id,
                change=ChangeRead.model_validate(change),
                affected=dependencies.affected,
                conflicts=conflicts,
                impact=impact,
            )
            from app.services.risk_service import ensure_conflict_risks
            from app.services.task_service import generate_follow_up_tasks

            ensure_conflict_risks(db, result)
            generate_follow_up_tasks(db, result)
        logger.info(
            "Operational change committed: %s (%s conflicts, severity=%s)",
            result.change_id,
            result.impact.conflict_count,
            result.impact.severity,
        )
        return result
    except Exception:
        db.rollback()
        logger.exception("Operational change rolled back: event=%s target=%s/%s", event_id, entity_type, entity_id)
        raise
