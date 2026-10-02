"""Risk CRUD and deterministic conflict-to-risk synchronization."""

from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Event, Risk, Session as EventSession, Venue
from app.schemas import RiskCreate, RiskUpdate, VerifiedImpactResponse

RISK_STATUS_ACTIVE = {"open", "monitoring", "mitigating"}
CONFLICT_RISKS = {
    "venue_schedule_overlap": ("Confirmed venue schedule overlap", "high"),
    "speaker_overlap": ("Confirmed speaker double-booking", "high"),
    "volunteer_overlap": ("Confirmed volunteer overlap", "medium"),
    "equipment_conflict": ("Confirmed equipment conflict", "medium"),
}


class RiskNotFound(LookupError):
    pass


class RiskEventNotFound(LookupError):
    pass


class RiskOwnershipError(ValueError):
    pass


class RiskReferenceNotFound(LookupError):
    pass


def _validate_event(db: Session, event_id: str) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise RiskEventNotFound(event_id)
    return event


def _validate_reference(db: Session, event_id: str, model: type, entity_id: str | None, label: str) -> None:
    if entity_id is None:
        return
    entity = db.get(model, entity_id)
    if entity is None:
        raise RiskReferenceNotFound(f"{label} not found")
    if entity.event_id != event_id:
        raise RiskOwnershipError(f"{label} must belong to the risk event")


def list_event_risks(db: Session, event_id: str) -> list[Risk]:
    _validate_event(db, event_id)
    return list(db.scalars(select(Risk).where(Risk.event_id == event_id).order_by(Risk.severity, Risk.title, Risk.id)).all())


def get_risk(db: Session, risk_id: str) -> Risk:
    risk = db.get(Risk, risk_id)
    if risk is None:
        raise RiskNotFound(risk_id)
    return risk


def create_risk(db: Session, event_id: str, request: RiskCreate) -> Risk:
    _validate_event(db, event_id)
    _validate_reference(db, event_id, EventSession, request.session_id, "Session")
    _validate_reference(db, event_id, Venue, request.venue_id, "Venue")
    risk = Risk(id=f"risk_{uuid4().hex}", event_id=event_id, **request.model_dump())
    db.add(risk)
    db.commit()
    return risk


def update_risk(db: Session, risk_id: str, request: RiskUpdate) -> Risk:
    risk = db.get(Risk, risk_id)
    if risk is None:
        raise RiskNotFound(risk_id)
    updates = request.model_dump(exclude_unset=True)
    for field in ("title", "description", "severity", "status"):
        if field in updates and updates[field] is None:
            raise ValueError(f"{field} cannot be null")
    _validate_reference(db, risk.event_id, EventSession, updates.get("session_id", risk.session_id), "Session")
    _validate_reference(db, risk.event_id, Venue, updates.get("venue_id", risk.venue_id), "Venue")
    for field, value in updates.items():
        setattr(risk, field, value)
    db.commit()
    return risk


def list_risks_for_change(db: Session, verified: VerifiedImpactResponse) -> list[Risk]:
    risk_ids = {item.id for item in verified.affected.risks}
    conditions = [Risk.source_change_id == verified.change_id]
    if risk_ids:
        conditions.append(Risk.id.in_(risk_ids))
    statement = select(Risk).where(Risk.event_id == verified.change.event_id, or_(*conditions))
    return list(db.scalars(statement.order_by(Risk.severity, Risk.title, Risk.id)).all())


def ensure_conflict_risks(db: Session, verified: VerifiedImpactResponse) -> list[Risk]:
    """Create or refresh active risks only for conflicts verified by the backend."""
    saved: dict[str, Risk] = {}
    for conflict in verified.conflicts:
        title_and_severity = CONFLICT_RISKS.get(conflict.type)
        if title_and_severity is None:
            continue
        title, severity = title_and_severity
        related_sessions = sorted(
            entity_id
            for entity_id in conflict.entity_ids
            if (session := db.get(EventSession, entity_id)) is not None
            and session.event_id == verified.change.event_id
        )
        related_venues = sorted(
            entity_id
            for entity_id in conflict.entity_ids
            if (venue := db.get(Venue, entity_id)) is not None
            and venue.event_id == verified.change.event_id
        )
        session_id = related_sessions[0] if related_sessions else None
        venue_id = related_venues[0] if related_venues else None
        if session_id is None and venue_id is None:
            continue

        identity_filters = [Risk.session_id == session_id] if session_id else [Risk.venue_id == venue_id]
        statement = select(Risk).where(
            Risk.event_id == verified.change.event_id,
            Risk.title == title,
            Risk.status.in_(RISK_STATUS_ACTIVE),
            *identity_filters,
        )
        risk = db.scalar(statement.order_by(Risk.id).limit(1))
        if risk is None:
            risk = Risk(
                id=f"risk_{uuid4().hex}",
                event_id=verified.change.event_id,
                source_change_id=verified.change_id,
                title=title,
                description=conflict.message,
                severity=severity,
                status="open",
                session_id=session_id,
                venue_id=venue_id,
            )
            db.add(risk)
            db.flush()
        else:
            risk.description = conflict.message
            risk.severity = severity
        saved[risk.id] = risk
    return list(saved.values())
