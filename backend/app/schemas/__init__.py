"""Pydantic response schemas for the read API."""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class EventRead(ORMModel):
    id: str
    name: str
    description: str
    date: date
    start_time: datetime
    end_time: datetime
    status: str


class VenueRead(ORMModel):
    id: str
    event_id: str
    name: str
    location: str
    capacity: int
    status: str


class SpeakerRead(ORMModel):
    id: str
    event_id: str
    name: str
    organization: str
    email: str
    title: str


class VolunteerRead(ORMModel):
    id: str
    event_id: str
    name: str
    email: str
    role: str
    availability: str


class EquipmentRead(ORMModel):
    id: str
    event_id: str
    venue_id: str | None
    name: str
    category: str
    quantity: int
    status: str


class SessionRead(ORMModel):
    id: str
    event_id: str
    venue_id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    status: str
    venue: VenueRead
    speakers: list[SpeakerRead] = Field(default_factory=list)
    volunteers: list[VolunteerRead] = Field(default_factory=list)
    equipment: list[EquipmentRead] = Field(default_factory=list)


class TaskRead(ORMModel):
    id: str
    event_id: str
    title: str
    description: str
    status: str
    priority: str
    due_time: datetime
    assigned_volunteer_id: str | None
    session_id: str | None
    venue_id: str | None


class RiskRead(ORMModel):
    id: str
    event_id: str
    title: str
    description: str
    severity: str
    status: str
    venue_id: str | None
    session_id: str | None


class EventDetail(EventRead):
    venues: list[VenueRead] = Field(default_factory=list)
    sessions: list[SessionRead] = Field(default_factory=list)


DependencyEntityType = Literal[
    "event", "venue", "session", "speaker", "volunteer", "equipment", "task", "risk"
]


class DependencySource(BaseModel):
    entity_type: DependencyEntityType
    entity_id: str


class EntityReference(BaseModel):
    id: str
    name: str


class AffectedEntities(BaseModel):
    events: list[EntityReference] = Field(default_factory=list)
    venues: list[EntityReference] = Field(default_factory=list)
    sessions: list[EntityReference] = Field(default_factory=list)
    speakers: list[EntityReference] = Field(default_factory=list)
    volunteers: list[EntityReference] = Field(default_factory=list)
    equipment: list[EntityReference] = Field(default_factory=list)
    tasks: list[EntityReference] = Field(default_factory=list)
    risks: list[EntityReference] = Field(default_factory=list)


class DependencyResult(BaseModel):
    source: DependencySource
    affected: AffectedEntities


class ChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_type: str = Field(min_length=1, max_length=32)
    entity_id: str = Field(min_length=1, max_length=64)
    field_name: str = Field(min_length=1, max_length=64)
    new_value: Any
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Reason cannot be blank")
        return value


class ChangeRead(ORMModel):
    id: str
    event_id: str
    entity_type: str
    entity_id: str
    field_name: str
    old_value: str | None
    new_value: str | None
    reason: str
    created_by: str | None
    created_at: datetime


class ConflictItem(BaseModel):
    type: Literal[
        "venue_schedule_overlap",
        "speaker_overlap",
        "volunteer_overlap",
        "equipment_conflict",
    ]
    severity: Literal["high", "medium"]
    message: str
    entity_ids: list[str]


class ImpactCounts(BaseModel):
    sessions: int
    speakers: int
    volunteers: int
    equipment: int
    tasks: int
    risks: int


class ImpactSummary(BaseModel):
    counts: ImpactCounts
    conflict_count: int
    severity: Literal["low", "medium", "high"]
    reasons: list[str]


class ImpactVerification(BaseModel):
    source: Literal["database"] = "database"
    deterministic: Literal[True] = True


class VerifiedImpactResponse(BaseModel):
    change_id: str
    change: ChangeRead
    affected: AffectedEntities
    conflicts: list[ConflictItem]
    impact: ImpactSummary
    verification: ImpactVerification = Field(default_factory=ImpactVerification)
