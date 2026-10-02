"""Deterministic checks for schedule and resource conflicts supported by the schema."""

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Session as EventSession
from app.schemas import ConflictItem


def _overlaps(start: datetime, end: datetime, other: EventSession) -> bool:
    return start < other.end_time and other.start_time < end


def _conflict(
    conflict_type: str,
    severity: str,
    message: str,
    entity_ids: Iterable[str],
) -> ConflictItem:
    return ConflictItem(
        type=conflict_type,
        severity=severity,
        message=message,
        entity_ids=sorted(set(entity_ids)),
    )


def _session_conflicts(
    db: Session,
    event_id: str,
    session: EventSession,
    field_name: str,
    new_value: object,
) -> list[ConflictItem]:
    start_time = new_value if field_name == "start_time" else session.start_time
    end_time = new_value if field_name == "end_time" else session.end_time
    venue_id = new_value if field_name == "venue_id" else session.venue_id
    other_sessions = list(
        db.scalars(
            select(EventSession).where(
                EventSession.event_id == event_id,
                EventSession.id != session.id,
            )
        ).all()
    )
    overlapping = [other for other in other_sessions if _overlaps(start_time, end_time, other)]
    conflicts: dict[tuple[str, tuple[str, ...]], ConflictItem] = {}

    for other in overlapping:
        if other.venue_id == venue_id:
            item = _conflict(
                "venue_schedule_overlap",
                "high",
                f"Session '{session.title}' overlaps '{other.title}' at venue '{other.venue.name}'.",
                [session.id, other.id, other.venue_id],
            )
            conflicts[(item.type, tuple(item.entity_ids))] = item

        shared_speakers = {speaker.id: speaker for speaker in session.speakers}.keys() & {
            speaker.id for speaker in other.speakers
        }
        for speaker_id in sorted(shared_speakers):
            speaker = next(person for person in session.speakers if person.id == speaker_id)
            item = _conflict(
                "speaker_overlap",
                "high",
                f"Speaker '{speaker.name}' is scheduled for overlapping sessions.",
                [speaker_id, session.id, other.id],
            )
            conflicts[(item.type, tuple(item.entity_ids))] = item

        shared_volunteers = {person.id: person for person in session.volunteers}.keys() & {
            person.id for person in other.volunteers
        }
        for volunteer_id in sorted(shared_volunteers):
            volunteer = next(person for person in session.volunteers if person.id == volunteer_id)
            item = _conflict(
                "volunteer_overlap",
                "medium",
                f"Volunteer '{volunteer.name}' is assigned to overlapping sessions.",
                [volunteer_id, session.id, other.id],
            )
            conflicts[(item.type, tuple(item.entity_ids))] = item

    for equipment in session.equipment:
        assigned_overlaps = [
            other
            for other in overlapping
            if any(item.id == equipment.id for item in other.equipment)
        ]
        points = {start_time}
        points.update(
            other.start_time
            for other in assigned_overlaps
            if start_time <= other.start_time < end_time
        )
        for point in points:
            active_others = [
                other
                for other in assigned_overlaps
                if other.start_time <= point < other.end_time
            ]
            if len(active_others) + 1 > equipment.quantity:
                item = _conflict(
                    "equipment_conflict",
                    "medium",
                    f"Equipment '{equipment.name}' is assigned to overlapping sessions beyond its recorded quantity.",
                    [equipment.id, session.id, *(other.id for other in active_others)],
                )
                conflicts[(item.type, tuple(item.entity_ids))] = item

    return list(conflicts.values())


def _equipment_quantity_conflicts(
    equipment_id: str, quantity: int, sessions: list[EventSession]
) -> list[ConflictItem]:
    conflicts: dict[tuple[str, ...], ConflictItem] = {}
    for point in sorted({session.start_time for session in sessions}):
        active = [session for session in sessions if session.start_time <= point < session.end_time]
        if len(active) > quantity:
            ids = [equipment_id, *(session.id for session in active)]
            item = _conflict(
                "equipment_conflict",
                "medium",
                "Overlapping sessions require more units of this equipment than the recorded quantity.",
                ids,
            )
            conflicts[tuple(item.entity_ids)] = item
    return list(conflicts.values())


def detect_conflicts(
    db: Session,
    *,
    event_id: str,
    entity_type: str,
    entity: object,
    field_name: str,
    new_value: object,
) -> list[ConflictItem]:
    """Return only conflicts directly supported by scheduled assignments and inventory."""
    conflicts: list[ConflictItem] = []
    if entity_type == "session" and field_name in {"venue_id", "start_time", "end_time"}:
        conflicts.extend(
            _session_conflicts(db, event_id, entity, field_name, new_value)
        )
    elif entity_type == "equipment" and field_name == "quantity":
        conflicts.extend(
            _equipment_quantity_conflicts(entity.id, new_value, list(entity.sessions))
        )

    return sorted(conflicts, key=lambda item: (item.type, item.entity_ids))
