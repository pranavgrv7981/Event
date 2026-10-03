"""Read-only proposed-change analysis for administrator review."""

from app.models import ChangeRequest as ChangeRequestModel
from app.schemas import (
    AffectedEntities,
    ChangeRead,
    EntityReference,
    VerifiedImpactResponse,
)
from app.services.conflict_service import detect_conflicts
from app.services.dependency_engine import (
    ENTITY_MODELS,
    EntityNotFound,
    UnsupportedEntityType,
    get_affected_entities,
)
from app.services.impact_service import (
    CHANGEABLE_FIELDS,
    EntityOwnershipError,
    EventNotFound,
    UnchangedValue,
    UnsupportedChangeField,
    _parse_value,
    _serialize_value,
    _validate_related_entity,
    _validate_time_range,
    analyze_impact,
)
from sqlalchemy.orm import Session


def build_change_request_preview(
    db: Session, request: ChangeRequestModel
) -> tuple[VerifiedImpactResponse, str, str]:
    """Calculate proposed impact using reads and in-memory values only."""
    entity_type = request.entity_type
    if entity_type not in ENTITY_MODELS or entity_type == "change":
        raise UnsupportedEntityType(entity_type)
    if request.field_name not in CHANGEABLE_FIELDS[entity_type]:
        raise UnsupportedChangeField(request.field_name)

    event = db.get(ENTITY_MODELS["event"], request.event_id)
    if event is None:
        raise EventNotFound(request.event_id)
    target = db.get(ENTITY_MODELS[entity_type], request.entity_id)
    if target is None:
        raise EntityNotFound(f"{entity_type}/{request.entity_id}")
    target_event_id = target.id if entity_type == "event" else target.event_id
    if target_event_id != request.event_id:
        raise EntityOwnershipError("Target entity belongs to another event")

    parsed_value = _parse_value(target, request.field_name, request.new_value)
    current_value = getattr(target, request.field_name)
    if current_value == parsed_value:
        raise UnchangedValue("New value is the same as the current value")
    _validate_related_entity(
        db, request.event_id, entity_type, request.field_name, parsed_value
    )
    _validate_time_range(target, request.field_name, parsed_value)

    dependencies = get_affected_entities(db, entity_type, request.entity_id)
    conflicts = detect_conflicts(
        db,
        event_id=request.event_id,
        entity_type=entity_type,
        entity=target,
        field_name=request.field_name,
        new_value=parsed_value,
    )
    affected = dependencies.affected
    if entity_type == "session" and request.field_name == "venue_id":
        proposed_venue = db.get(ENTITY_MODELS["venue"], parsed_value)
        venues = {item.id: item for item in affected.venues}
        venues[proposed_venue.id] = EntityReference(
            id=proposed_venue.id, name=proposed_venue.name
        )
        affected = affected.model_copy(update={
            "venues": sorted(venues.values(), key=lambda item: item.id)
        })

    change_id = f"preview_{request.id}"
    preview = VerifiedImpactResponse(
        change_id=change_id,
        change=ChangeRead(
            id=change_id,
            event_id=request.event_id,
            entity_type=entity_type,
            entity_id=request.entity_id,
            field_name=request.field_name,
            old_value=_serialize_value(current_value),
            new_value=_serialize_value(parsed_value),
            reason=request.reason,
            created_by=request.created_by,
            created_at=request.created_at,
        ),
        affected=affected,
        conflicts=conflicts,
        impact=analyze_impact(affected, conflicts),
    )
    consequence = (
        f"If accepted, {entity_type} {request.entity_id} {request.field_name} "
        f"will change from {_serialize_value(current_value)} to {_serialize_value(parsed_value)}. "
        "Related follow-up work is generated only after acceptance."
    )
    if not conflicts:
        resolution = "No conflicts detected in the proposed change."
    else:
        suggestions = {
            "venue_schedule_overlap": "Choose a different venue or adjust the session time.",
            "speaker_overlap": "Coordinate the speaker or adjust one session time.",
            "volunteer_overlap": "Reassign volunteers or adjust one session time.",
            "equipment_conflict": "Reassign equipment or reduce overlapping demand.",
        }
        resolution = " ".join(
            suggestions.get(item.type, "Review the conflict before accepting.")
            for item in conflicts
        )
    return preview, consequence, resolution
