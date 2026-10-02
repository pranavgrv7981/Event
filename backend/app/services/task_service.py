"""Task CRUD, verified-impact follow-ups, and change-related task lookup."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Event, Session as EventSession, Task, Venue, Volunteer
from app.schemas import TaskCreate, TaskUpdate, VerifiedImpactResponse

OPEN_TASK_STATUSES = {"open", "todo", "in_progress", "blocked"}
TASK_CONTEXT_OPTIONS = (
    selectinload(Task.session).selectinload(EventSession.venue),
    selectinload(Task.session).selectinload(EventSession.speakers),
    selectinload(Task.session).selectinload(EventSession.volunteers),
    selectinload(Task.session).selectinload(EventSession.equipment),
    selectinload(Task.venue),
    selectinload(Task.assigned_volunteer),
)


class TaskNotFound(LookupError):
    pass


class TaskEventNotFound(LookupError):
    pass


class TaskOwnershipError(ValueError):
    pass


class TaskReferenceNotFound(LookupError):
    pass


def _validate_event(db: Session, event_id: str) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise TaskEventNotFound(event_id)
    return event


def _validate_reference(db: Session, event_id: str, model: type, entity_id: str | None, label: str) -> None:
    if entity_id is None:
        return
    entity = db.get(model, entity_id)
    if entity is None:
        raise TaskReferenceNotFound(f"{label} not found")
    if entity.event_id != event_id:
        raise TaskOwnershipError(f"{label} must belong to the task event")


def list_event_tasks(db: Session, event_id: str) -> list[Task]:
    _validate_event(db, event_id)
    statement = (
        select(Task)
        .where(Task.event_id == event_id)
        .options(*TASK_CONTEXT_OPTIONS)
        .order_by(Task.due_time, Task.id)
    )
    return list(db.scalars(statement).all())


def get_task(db: Session, task_id: str) -> Task:
    task = db.scalar(
        select(Task).where(Task.id == task_id).options(*TASK_CONTEXT_OPTIONS)
    )
    if task is None:
        raise TaskNotFound(task_id)
    return task


def create_task(db: Session, event_id: str, request: TaskCreate) -> Task:
    _validate_event(db, event_id)
    _validate_reference(db, event_id, Volunteer, request.assigned_volunteer_id, "Volunteer")
    _validate_reference(db, event_id, EventSession, request.session_id, "Session")
    _validate_reference(db, event_id, Venue, request.venue_id, "Venue")
    task = Task(id=f"task_{uuid4().hex}", event_id=event_id, **request.model_dump())
    db.add(task)
    db.commit()
    return get_task(db, task.id)


def update_task(db: Session, task_id: str, request: TaskUpdate) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise TaskNotFound(task_id)
    updates = request.model_dump(exclude_unset=True)
    for field in ("title", "description", "due_time", "status", "priority"):
        if field in updates and updates[field] is None:
            raise ValueError(f"{field} cannot be null")
    _validate_reference(db, task.event_id, Volunteer, updates.get("assigned_volunteer_id", task.assigned_volunteer_id), "Volunteer")
    _validate_reference(db, task.event_id, EventSession, updates.get("session_id", task.session_id), "Session")
    _validate_reference(db, task.event_id, Venue, updates.get("venue_id", task.venue_id), "Venue")
    for field, value in updates.items():
        setattr(task, field, value)
    db.commit()
    db.expire(task, ["assigned_volunteer", "session", "venue"])
    return get_task(db, task_id)


def list_volunteer_tasks(db: Session, volunteer_id: str) -> list[Task]:
    volunteer = db.get(Volunteer, volunteer_id)
    if volunteer is None:
        raise TaskReferenceNotFound("Volunteer not found")
    statement = (
        select(Task)
        .where(Task.assigned_volunteer_id == volunteer_id)
        .options(*TASK_CONTEXT_OPTIONS)
        .order_by(Task.due_time, Task.id)
    )
    return list(db.scalars(statement).all())


def list_tasks_for_change(db: Session, verified: VerifiedImpactResponse) -> list[Task]:
    conditions = [Task.source_change_id == verified.change_id]
    affected_task_ids = [item.id for item in verified.affected.tasks]
    if affected_task_ids:
        conditions.append(Task.id.in_(affected_task_ids))
    statement = (
        select(Task)
        .where(Task.event_id == verified.change.event_id, or_(*conditions))
        .options(*TASK_CONTEXT_OPTIONS)
        .order_by(Task.due_time, Task.id)
    )
    return list(db.scalars(statement).all())


def generate_follow_up_tasks(db: Session, verified: VerifiedImpactResponse) -> list[Task]:
    """Create or reuse one unresolved task per nonzero verified impact category."""
    counts = verified.impact.counts
    templates = (
        ("sessions", "Review affected session schedules"),
        ("changed_session", "Review changed session schedule"),
        ("speakers", "Confirm speaker updates"),
        ("volunteers", "Review volunteer assignments"),
        ("equipment", "Verify affected equipment assignments"),
        ("tasks", "Review related operational tasks"),
        ("risks", "Review related recorded risks"),
    )
    change = verified.change
    source_session_id = change.entity_id if change.entity_type == "session" else None
    source_venue_id = change.entity_id if change.entity_type == "venue" else None
    if source_session_id is None and len(verified.affected.sessions) == 1:
        source_session_id = verified.affected.sessions[0].id
    if source_venue_id is None and len(verified.affected.venues) == 1:
        source_venue_id = verified.affected.venues[0].id

    priority = {"low": "low", "medium": "medium", "high": "high"}[verified.impact.severity]
    due_time = change.created_at or datetime.now(timezone.utc)
    task_ids = []
    for category, title in templates:
        count = 1 if category == "changed_session" and change.entity_type == "session" else (
            0 if category == "changed_session" else getattr(counts, category)
        )
        if count <= 0:
            continue
        identity_filters = (
            [Task.session_id == source_session_id]
            if source_session_id
            else [Task.venue_id == source_venue_id]
        )
        statement = select(Task).where(
            Task.event_id == change.event_id,
            Task.title == title,
            Task.status.in_(OPEN_TASK_STATUSES),
            *identity_filters,
        )
        existing = db.scalar(statement.order_by(Task.id).limit(1))
        if existing is not None:
            task_ids.append(existing.id)
            continue
        task = Task(
            id=f"task_{uuid4().hex}",
            event_id=change.event_id,
            source_change_id=change.id,
            title=title,
            description=(
                f"Generated from verified change {change.id} for session {change.entity_id}."
                if category == "changed_session"
                else f"Generated from verified change {change.id}; "
                f"the verified impact lists {count} {category} entries."
            ),
            status="open",
            priority=priority,
            due_time=due_time,
            session_id=source_session_id,
            venue_id=source_venue_id,
        )
        db.add(task)
        db.flush()
        task_ids.append(task.id)
    return [get_task(db, task_id) for task_id in task_ids]
