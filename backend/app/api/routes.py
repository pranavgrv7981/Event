"""Basic read endpoints for seeded event operations data."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Equipment, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import (
    EquipmentRead,
    EventDetail,
    EventRead,
    DependencyResult,
    ChangeRead,
    ChangeRequest,
    AIImpactAnalysisResponse,
    RiskRead,
    SessionRead,
    SpeakerRead,
    TaskRead,
    VenueRead,
    VerifiedImpactResponse,
    VolunteerRead,
)
from app.services.dependency_engine import (
    EntityNotFound,
    InvalidEntityIdentifier,
    UnsupportedEntityType,
    get_affected_entities,
)
from app.services.impact_service import (
    EntityOwnershipError,
    EventNotFound,
    InvalidChangeValue,
    UnchangedValue,
    UnsupportedChangeField,
    process_change,
    reconstruct_verified_impact,
)
from app.services.ai_impact_service import analyze_verified_impact
from app.models import Change

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/events/{event_id}/changes",
    response_model=VerifiedImpactResponse,
    status_code=201,
)
def create_event_change(
    event_id: str, request: ChangeRequest, db: Session = Depends(get_db)
) -> VerifiedImpactResponse:
    try:
        return process_change(
            db,
            event_id=event_id,
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            field_name=request.field_name,
            new_value=request.new_value,
            reason=request.reason,
        )
    except EventNotFound as exc:
        raise HTTPException(status_code=404, detail="Event not found") from exc
    except EntityNotFound as exc:
        raise HTTPException(status_code=404, detail="Target entity not found") from exc
    except (
        EntityOwnershipError,
        InvalidChangeValue,
        InvalidEntityIdentifier,
        UnchangedValue,
        UnsupportedChangeField,
        UnsupportedEntityType,
    ) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        logger.exception("Change processing failed for event %s", event_id)
        raise HTTPException(status_code=500, detail="Change processing failed") from exc
    except Exception as exc:
        logger.exception("Unexpected change processing failure for event %s", event_id)
        raise HTTPException(status_code=500, detail="Change processing failed") from exc


@router.get("/events/{event_id}/changes", response_model=list[ChangeRead])
def list_event_changes(event_id: str, db: Session = Depends(get_db)) -> list[Change]:
    if db.get(Event, event_id) is None:
        raise HTTPException(status_code=404, detail="Event not found")
    statement = select(Change).where(Change.event_id == event_id).order_by(
        Change.created_at.desc(), Change.id.desc()
    )
    return list(db.scalars(statement).all())


@router.get("/changes/{change_id}", response_model=ChangeRead)
def get_change(change_id: str, db: Session = Depends(get_db)) -> Change:
    change = db.get(Change, change_id)
    if change is None:
        raise HTTPException(status_code=404, detail="Change not found")
    return change


@router.post("/changes/{change_id}/analyze", response_model=AIImpactAnalysisResponse)
def analyze_change(change_id: str, db: Session = Depends(get_db)) -> AIImpactAnalysisResponse:
    change = db.get(Change, change_id)
    if change is None:
        raise HTTPException(status_code=404, detail="Change not found")
    try:
        verified = reconstruct_verified_impact(db, change)
        return analyze_verified_impact(verified)
    except EntityNotFound as exc:
        raise HTTPException(status_code=404, detail="Change target entity not found") from exc
    except SQLAlchemyError as exc:
        logger.exception("Verified impact reconstruction failed for change %s", change_id)
        raise HTTPException(status_code=500, detail="Impact analysis failed") from exc
    except Exception as exc:
        logger.exception("Impact analysis failed for change %s", change_id)
        raise HTTPException(status_code=500, detail="Impact analysis failed") from exc


@router.get("/dependencies/{entity_type}/{entity_id}", response_model=DependencyResult)
def get_dependencies(
    entity_type: str, entity_id: str, db: Session = Depends(get_db)
) -> DependencyResult:
    try:
        return get_affected_entities(db, entity_type, entity_id)
    except UnsupportedEntityType as exc:
        raise HTTPException(status_code=422, detail="Unsupported entity type") from exc
    except InvalidEntityIdentifier as exc:
        raise HTTPException(status_code=422, detail="Invalid entity identifier") from exc
    except EntityNotFound as exc:
        raise HTTPException(status_code=404, detail="Entity not found") from exc
    except SQLAlchemyError as exc:
        logger.exception("Dependency lookup failed for %s/%s", entity_type, entity_id)
        raise HTTPException(status_code=500, detail="Dependency lookup failed") from exc


@router.get("/events", response_model=list[EventRead])
def list_events(db: Session = Depends(get_db)) -> list[Event]:
    return list(db.scalars(select(Event).order_by(Event.date, Event.name)).all())


@router.get("/events/{event_id}", response_model=EventDetail)
def get_event(event_id: str, db: Session = Depends(get_db)) -> Event:
    statement = (
        select(Event)
        .where(Event.id == event_id)
        .options(
            selectinload(Event.venues),
            selectinload(Event.sessions).selectinload(EventSession.venue),
            selectinload(Event.sessions).selectinload(EventSession.speakers),
            selectinload(Event.sessions).selectinload(EventSession.volunteers),
            selectinload(Event.sessions).selectinload(EventSession.equipment),
        )
    )
    event = db.scalar(statement)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/venues", response_model=list[VenueRead])
def list_venues(db: Session = Depends(get_db)) -> list[Venue]:
    return list(db.scalars(select(Venue).order_by(Venue.name)).all())


@router.get("/sessions", response_model=list[SessionRead])
def list_sessions(db: Session = Depends(get_db)) -> list[EventSession]:
    statement = select(EventSession).options(
        selectinload(EventSession.venue),
        selectinload(EventSession.speakers),
        selectinload(EventSession.volunteers),
        selectinload(EventSession.equipment),
    ).order_by(EventSession.start_time)
    return list(db.scalars(statement).all())


@router.get("/speakers", response_model=list[SpeakerRead])
def list_speakers(db: Session = Depends(get_db)) -> list[Speaker]:
    return list(db.scalars(select(Speaker).order_by(Speaker.name)).all())


@router.get("/volunteers", response_model=list[VolunteerRead])
def list_volunteers(db: Session = Depends(get_db)) -> list[Volunteer]:
    return list(db.scalars(select(Volunteer).order_by(Volunteer.name)).all())


@router.get("/equipment", response_model=list[EquipmentRead])
def list_equipment(db: Session = Depends(get_db)) -> list[Equipment]:
    return list(db.scalars(select(Equipment).order_by(Equipment.name)).all())


@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db)) -> list[Task]:
    return list(db.scalars(select(Task).order_by(Task.due_time)).all())


@router.get("/risks", response_model=list[RiskRead])
def list_risks(db: Session = Depends(get_db)) -> list[Risk]:
    return list(db.scalars(select(Risk).order_by(Risk.severity, Risk.title)).all())
