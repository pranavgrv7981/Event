"""Deterministic traversal of relationships explicitly stored in the database."""

import logging
from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.models import Equipment, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import AffectedEntities, DependencyResult, DependencySource, EntityReference

logger = logging.getLogger(__name__)

ENTITY_MODELS = {
    "event": Event,
    "venue": Venue,
    "session": EventSession,
    "speaker": Speaker,
    "volunteer": Volunteer,
    "equipment": Equipment,
    "task": Task,
    "risk": Risk,
}
DISPLAY_FIELDS = {
    "event": "name",
    "venue": "name",
    "session": "title",
    "speaker": "name",
    "volunteer": "name",
    "equipment": "name",
    "task": "title",
    "risk": "title",
}
RESULT_KEYS = {
    "event": "events",
    "venue": "venues",
    "session": "sessions",
    "speaker": "speakers",
    "volunteer": "volunteers",
    "equipment": "equipment",
    "task": "tasks",
    "risk": "risks",
}


class UnsupportedEntityType(ValueError):
    """Raised when traversal is requested for an unsupported entity type."""


class InvalidEntityIdentifier(ValueError):
    """Raised when an entity identifier is malformed."""


class EntityNotFound(LookupError):
    """Raised when a supported entity identifier does not exist."""


def get_affected_entities(db: Session, entity_type: str, entity_id: str) -> DependencyResult:
    """Return unique, stable references reachable by the source-specific schema links."""
    if entity_type not in ENTITY_MODELS:
        raise UnsupportedEntityType(entity_type)
    if not entity_id or entity_id != entity_id.strip() or len(entity_id) > 64:
        raise InvalidEntityIdentifier(entity_id)

    logger.info("Dependency traversal started: %s/%s", entity_type, entity_id)
    source = db.get(ENTITY_MODELS[entity_type], entity_id)
    if source is None:
        raise EntityNotFound(f"{entity_type}/{entity_id}")

    found: dict[str, dict[str, EntityReference]] = {
        key: {} for key in RESULT_KEYS.values()
    }

    def add(kind: str, entities: Iterable[object] | object | None) -> None:
        if entities is None:
            return
        if not isinstance(entities, Iterable) or isinstance(entities, (str, bytes)):
            entities = [entities]
        key = RESULT_KEYS[kind]
        for entity in entities:
            found[key][entity.id] = EntityReference(
                id=entity.id, name=getattr(entity, DISPLAY_FIELDS[kind])
            )

    def add_session(session: EventSession, *, exclude_speaker_id: str | None = None) -> None:
        add("session", session)
        add("venue", session.venue)
        add("speaker", [speaker for speaker in session.speakers if speaker.id != exclude_speaker_id])
        add("volunteer", session.volunteers)
        add("equipment", session.equipment)
        add("task", session.tasks)
        add("risk", session.risks)

    if entity_type == "event":
        add("venue", source.venues)
        add("session", source.sessions)
        add("speaker", source.speakers)
        add("volunteer", source.volunteers)
        add("equipment", source.equipment)
        add("task", source.tasks)
        add("risk", source.risks)
    elif entity_type == "venue":
        add("task", source.tasks)
        add("risk", source.risks)
        for session in source.sessions:
            add_session(session)
    elif entity_type == "session":
        add("venue", source.venue)
        add("speaker", source.speakers)
        add("volunteer", source.volunteers)
        add("equipment", source.equipment)
        add("task", source.tasks)
        add("risk", source.risks)
    elif entity_type == "speaker":
        for session in source.sessions:
            add_session(session, exclude_speaker_id=source.id)
    elif entity_type == "volunteer":
        add("task", source.tasks)
        for session in source.sessions:
            add("session", session)
            add("venue", session.venue)
    elif entity_type == "equipment":
        add("venue", source.venue)
        if source.venue is not None:
            add("task", source.venue.tasks)
            add("risk", source.venue.risks)
        for session in source.sessions:
            add("session", session)
            add("venue", session.venue)
            add("task", session.tasks)
            add("risk", session.risks)
    elif entity_type == "task":
        add("event", source.event)
        add("venue", source.venue)
        add("session", source.session)
        add("volunteer", source.assigned_volunteer)
    elif entity_type == "risk":
        add("event", source.event)
        add("venue", source.venue)
        add("session", source.session)

    affected = AffectedEntities(
        **{
            result_key: sorted(references.values(), key=lambda ref: ref.id)
            for result_key, references in found.items()
        }
    )
    result = DependencyResult(
        source=DependencySource(entity_type=entity_type, entity_id=entity_id), affected=affected
    )
    counts = ", ".join(f"{key}={len(value)}" for key, value in affected.model_dump().items())
    logger.info("Dependency traversal completed: %s/%s (%s)", entity_type, entity_id, counts)
    return result
