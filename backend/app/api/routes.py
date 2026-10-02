"""Basic read endpoints for seeded event operations data."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Equipment, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import (
    EquipmentRead,
    EventDetail,
    EventRead,
    RiskRead,
    SessionRead,
    SpeakerRead,
    TaskRead,
    VenueRead,
    VolunteerRead,
)

router = APIRouter()


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
