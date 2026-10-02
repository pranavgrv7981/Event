"""Event operations database entities."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models import session_equipment, session_speakers, session_volunteers


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Event(TimestampMixin, Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")

    venues: Mapped[list[Venue]] = relationship(back_populates="event", cascade="all, delete-orphan")
    sessions: Mapped[list[Session]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    speakers: Mapped[list[Speaker]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    volunteers: Mapped[list[Volunteer]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    equipment: Mapped[list[Equipment]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    tasks: Mapped[list[Task]] = relationship(back_populates="event", cascade="all, delete-orphan")
    risks: Mapped[list[Risk]] = relationship(back_populates="event", cascade="all, delete-orphan")
    changes: Mapped[list[Change]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class Venue(TimestampMixin, Base):
    __tablename__ = "venues"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    location: Mapped[str] = mapped_column(String(240), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="available")

    event: Mapped[Event] = relationship(back_populates="venues")
    sessions: Mapped[list[Session]] = relationship(back_populates="venue")
    equipment: Mapped[list[Equipment]] = relationship(back_populates="venue")
    tasks: Mapped[list[Task]] = relationship(back_populates="venue")
    risks: Mapped[list[Risk]] = relationship(back_populates="venue")


class Session(TimestampMixin, Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="scheduled")

    event: Mapped[Event] = relationship(back_populates="sessions")
    venue: Mapped[Venue] = relationship(back_populates="sessions")
    speakers: Mapped[list[Speaker]] = relationship(
        secondary=session_speakers, back_populates="sessions"
    )
    volunteers: Mapped[list[Volunteer]] = relationship(
        secondary=session_volunteers, back_populates="sessions"
    )
    equipment: Mapped[list[Equipment]] = relationship(
        secondary=session_equipment, back_populates="sessions"
    )
    tasks: Mapped[list[Task]] = relationship(back_populates="session")
    risks: Mapped[list[Risk]] = relationship(back_populates="session")


class Speaker(TimestampMixin, Base):
    __tablename__ = "speakers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    organization: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)

    event: Mapped[Event] = relationship(back_populates="speakers")
    sessions: Mapped[list[Session]] = relationship(
        secondary=session_speakers, back_populates="speakers"
    )


class Volunteer(TimestampMixin, Base):
    __tablename__ = "volunteers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    availability: Mapped[str] = mapped_column(String(32), nullable=False, default="available")

    event: Mapped[Event] = relationship(back_populates="volunteers")
    sessions: Mapped[list[Session]] = relationship(
        secondary=session_volunteers, back_populates="volunteers"
    )
    tasks: Mapped[list[Task]] = relationship(back_populates="assigned_volunteer")


class Equipment(TimestampMixin, Base):
    __tablename__ = "equipment"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="available")

    event: Mapped[Event] = relationship(back_populates="equipment")
    venue: Mapped[Venue | None] = relationship(back_populates="equipment")
    sessions: Mapped[list[Session]] = relationship(
        secondary=session_equipment, back_populates="equipment"
    )


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    source_change_id: Mapped[str | None] = mapped_column(
        ForeignKey("changes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    priority: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    due_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    assigned_volunteer_id: Mapped[str | None] = mapped_column(
        ForeignKey("volunteers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_id: Mapped[str | None] = mapped_column(
        ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    venue_id: Mapped[str | None] = mapped_column(
        ForeignKey("venues.id", ondelete="SET NULL"), nullable=True, index=True
    )

    event: Mapped[Event] = relationship(back_populates="tasks")
    source_change: Mapped[Change | None] = relationship(back_populates="generated_tasks")
    assigned_volunteer: Mapped[Volunteer | None] = relationship(back_populates="tasks")
    session: Mapped[Session | None] = relationship(back_populates="tasks")
    venue: Mapped[Venue | None] = relationship(back_populates="tasks")


class Risk(TimestampMixin, Base):
    __tablename__ = "risks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    source_change_id: Mapped[str | None] = mapped_column(
        ForeignKey("changes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    venue_id: Mapped[str | None] = mapped_column(
        ForeignKey("venues.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_id: Mapped[str | None] = mapped_column(
        ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    event: Mapped[Event] = relationship(back_populates="risks")
    source_change: Mapped[Change | None] = relationship(back_populates="generated_risks")
    venue: Mapped[Venue | None] = relationship(back_populates="risks")
    session: Mapped[Session | None] = relationship(back_populates="risks")


class Change(TimestampMixin, Base):
    __tablename__ = "changes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(160), nullable=True)

    event: Mapped[Event] = relationship(back_populates="changes")
    generated_tasks: Mapped[list[Task]] = relationship(back_populates="source_change")
    generated_risks: Mapped[list[Risk]] = relationship(back_populates="source_change")
