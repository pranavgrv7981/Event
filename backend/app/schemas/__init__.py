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
    source_change_id: str | None = None
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
    source_change_id: str | None = None
    title: str
    description: str
    severity: str
    status: str
    venue_id: str | None
    session_id: str | None


TaskStatus = Literal["open", "todo", "in_progress", "blocked", "done", "cancelled"]
TaskPriority = Literal["low", "medium", "high", "critical"]
RiskStatus = Literal["open", "monitoring", "mitigating", "mitigated", "closed"]
RiskSeverity = Literal["low", "medium", "high", "critical"]


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    due_time: datetime
    status: TaskStatus = "open"
    priority: TaskPriority = "medium"
    assigned_volunteer_id: str | None = None
    session_id: str | None = None
    venue_id: str | None = None

    @field_validator("title", "description")
    @classmethod
    def nonblank_task_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Task text cannot be blank")
        return value.strip()


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    due_time: datetime | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_volunteer_id: str | None = None
    session_id: str | None = None
    venue_id: str | None = None

    @field_validator("title", "description")
    @classmethod
    def nonblank_optional_task_text(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Task text cannot be blank")
        return value.strip() if value is not None else None


class TaskDetail(TaskRead):
    session: SessionRead | None = None
    venue: VenueRead | None = None
    assigned_volunteer: VolunteerRead | None = None


class RiskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    severity: RiskSeverity
    status: RiskStatus = "open"
    venue_id: str | None = None
    session_id: str | None = None

    @field_validator("title", "description")
    @classmethod
    def nonblank_risk_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Risk text cannot be blank")
        return value.strip()


class RiskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    severity: RiskSeverity | None = None
    status: RiskStatus | None = None
    venue_id: str | None = None
    session_id: str | None = None

    @field_validator("title", "description")
    @classmethod
    def nonblank_optional_risk_text(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Risk text cannot be blank")
        return value.strip() if value is not None else None


class TaskDashboard(BaseModel):
    total: int
    todo: int
    in_progress: int
    blocked: int
    done: int
    cancelled: int


class RiskDashboard(BaseModel):
    total: int
    open: int
    high: int


class SessionDashboard(BaseModel):
    total: int


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


class EventDashboard(BaseModel):
    event_id: str
    sessions: SessionDashboard
    tasks: TaskDashboard
    risks: RiskDashboard
    recent_changes: list[ChangeRead]
    active_conflicts: list[ConflictItem]


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


class AIContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class AIChange(AIContractModel):
    entity_type: str = Field(min_length=1, max_length=32)
    entity_id: str = Field(min_length=1, max_length=64)
    field_name: str = Field(min_length=1, max_length=64)
    old_value: str | None
    new_value: str | None
    reason: str = Field(max_length=2000)


class AIFactReference(AIContractModel):
    id: str
    name: str


class AIAffectedEntities(AIContractModel):
    events: list[AIFactReference]
    venues: list[AIFactReference]
    sessions: list[AIFactReference]
    speakers: list[AIFactReference]
    volunteers: list[AIFactReference]
    equipment: list[AIFactReference]
    tasks: list[AIFactReference]
    risks: list[AIFactReference]


class AIConflict(AIContractModel):
    type: Literal[
        "venue_schedule_overlap",
        "speaker_overlap",
        "volunteer_overlap",
        "equipment_conflict",
    ]
    severity: Literal["high", "medium"]
    message: str
    entity_ids: list[str]


class AIImpactCounts(AIContractModel):
    sessions: int = Field(ge=0)
    speakers: int = Field(ge=0)
    volunteers: int = Field(ge=0)
    equipment: int = Field(ge=0)
    tasks: int = Field(ge=0)
    risks: int = Field(ge=0)


class AIImpact(AIContractModel):
    counts: AIImpactCounts
    conflict_count: int = Field(ge=0)
    severity: Literal["low", "medium", "high"]
    reasons: list[str]


class AIImpactInput(AIContractModel):
    change: AIChange
    affected: AIAffectedEntities
    conflicts: list[AIConflict]
    impact: AIImpact


class AIImpactAnalysis(AIContractModel):
    summary: str = Field(min_length=1, max_length=600)
    priority: Literal["low", "medium", "high"]
    key_impacts: list[str] = Field(max_length=10)
    recommended_actions: list[str] = Field(max_length=10)
    warnings: list[str] = Field(max_length=10)


class AIImpactAnalysisResponse(AIContractModel):
    change_id: str
    source: Literal["verified_backend_impact"] = "verified_backend_impact"
    analysis_type: Literal["ai_generated", "deterministic_fallback"]
    provider: Literal["gemini", "fallback"]
    verified_impact: VerifiedImpactResponse
    analysis: AIImpactAnalysis
