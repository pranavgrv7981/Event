"""SQLAlchemy models and association tables."""

from sqlalchemy import Column, ForeignKey, Table

from app.database import Base

session_speakers = Table(
    "session_speakers",
    Base.metadata,
    Column("session_id", ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("speaker_id", ForeignKey("speakers.id", ondelete="CASCADE"), primary_key=True),
)
session_volunteers = Table(
    "session_volunteers",
    Base.metadata,
    Column("session_id", ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("volunteer_id", ForeignKey("volunteers.id", ondelete="CASCADE"), primary_key=True),
)
session_equipment = Table(
    "session_equipment",
    Base.metadata,
    Column("session_id", ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
    Column("equipment_id", ForeignKey("equipment.id", ondelete="CASCADE"), primary_key=True),
)

from app.models.domain import (  # noqa: E402
    Change,
    ChangeRequest,
    Equipment,
    Event,
    Risk,
    Session,
    Speaker,
    Task,
    Venue,
    Volunteer,
)

__all__ = [
    "Change",
    "ChangeRequest",
    "Equipment",
    "Event",
    "Risk",
    "Session",
    "Speaker",
    "Task",
    "Venue",
    "Volunteer",
]
