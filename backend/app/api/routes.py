"""Basic read endpoints for seeded event operations data."""

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.integrations.notion.sync import (
    NotionSyncFailure,
    NotionSyncResult,
    sync_change_to_notion,
    sync_change_request_to_notion,
)
from app.models import ChangeRequest as ChangeRequestModel
from app.models import Equipment, Event, Risk, Session as EventSession, Speaker, Task, Venue, Volunteer
from app.schemas import (
    EquipmentRead,
    EventDetail,
    EventRead,
    DependencyResult,
    ChangeRead,
    ChangeRequestCreate,
    ChangeRequestApprovalResponse,
    ChangeRequestRead,
    ChangeRequestRejectionResponse,
    ChangeRequestReviewResponse,
    ChangeRequestStatus,
    ChangeRequest,
    AIImpactAnalysisResponse,
    EventDashboard,
    RiskCreate,
    RiskUpdate,
    RiskRead,
    SessionRead,
    SpeakerRead,
    TaskRead,
    TaskCreate,
    TaskUpdate,
    TaskDetail,
    VenueRead,
    VerifiedImpactResponse,
    VolunteerRead,
)
from app.services.dependency_engine import (
    ENTITY_MODELS,
    EntityNotFound,
    InvalidEntityIdentifier,
    UnsupportedEntityType,
    get_affected_entities,
)
from app.services.impact_service import (
    CHANGEABLE_FIELDS,
    EntityOwnershipError,
    EventNotFound,
    InvalidChangeValue,
    UnchangedValue,
    UnsupportedChangeField,
    process_change,
    reconstruct_verified_impact,
)
from app.services.ai_impact_service import analyze_verified_impact
from app.services.change_request_preview import build_change_request_preview
from app.models import Change
from app.services.risk_service import (
    RiskEventNotFound,
    RiskNotFound,
    RiskOwnershipError,
    RiskReferenceNotFound,
    create_risk,
    get_risk,
    list_event_risks,
    list_risks_for_change,
    update_risk,
)
from app.services.task_service import (
    TaskEventNotFound,
    TaskNotFound,
    TaskOwnershipError,
    TaskReferenceNotFound,
    create_task,
    get_task,
    list_event_tasks,
    list_tasks_for_change,
    list_volunteer_tasks,
    update_task,
)
from app.services.conflict_service import detect_conflicts

router = APIRouter()
logger = logging.getLogger(__name__)


def _change_request_value(value: object) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


@router.post(
    "/events/{event_id}/change-requests",
    response_model=ChangeRequestRead,
    status_code=201,
)
def create_change_request(
    event_id: str, request: ChangeRequestCreate, db: Session = Depends(get_db)
) -> ChangeRequestModel:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if request.entity_type not in ENTITY_MODELS or request.entity_type == "change":
        raise HTTPException(status_code=422, detail="Unsupported change target entity")
    if request.field_name not in CHANGEABLE_FIELDS[request.entity_type]:
        raise HTTPException(status_code=422, detail="Unsupported change field")
    target = db.get(ENTITY_MODELS[request.entity_type], request.entity_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target entity not found")
    target_event_id = target.id if request.entity_type == "event" else target.event_id
    if target_event_id != event_id:
        raise HTTPException(status_code=422, detail="Target entity belongs to another event")

    change_request = ChangeRequestModel(
        id=f"change_request_{uuid4().hex}",
        event_id=event_id,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        field_name=request.field_name,
        old_value=_change_request_value(getattr(target, request.field_name)),
        new_value=request.new_value,
        reason=request.reason,
        created_by=request.created_by,
        status="PENDING",
    )
    db.add(change_request)
    db.commit()
    db.refresh(change_request)
    return change_request


@router.get("/change-requests", response_model=list[ChangeRequestRead])
def list_change_requests(
    event_id: str | None = None,
    status: ChangeRequestStatus | None = None,
    db: Session = Depends(get_db),
) -> list[ChangeRequestModel]:
    statement = select(ChangeRequestModel).order_by(
        ChangeRequestModel.created_at.desc(), ChangeRequestModel.id.desc()
    )
    if event_id is not None:
        statement = statement.where(ChangeRequestModel.event_id == event_id)
    if status is not None:
        statement = statement.where(ChangeRequestModel.status == status)
    return list(db.scalars(statement).all())


@router.get("/change-requests/{request_id}", response_model=ChangeRequestRead)
def get_change_request(request_id: str, db: Session = Depends(get_db)) -> ChangeRequestModel:
    change_request = db.get(ChangeRequestModel, request_id)
    if change_request is None:
        raise HTTPException(status_code=404, detail="Change request not found")
    return change_request


@router.get(
    "/change-requests/{request_id}/review",
    response_model=ChangeRequestReviewResponse,
)
def review_change_request(
    request_id: str, db: Session = Depends(get_db)
) -> ChangeRequestReviewResponse:
    change_request = db.get(ChangeRequestModel, request_id)
    if change_request is None:
        raise HTTPException(status_code=404, detail="Change request not found")
    if change_request.status != "PENDING":
        raise HTTPException(status_code=409, detail="Only PENDING requests can be reviewed")
    try:
        preview, consequences, resolution = build_change_request_preview(db, change_request)
        analysis = analyze_verified_impact(preview)
        return ChangeRequestReviewResponse(
            request=change_request,
            preview=preview,
            ai_analysis=analysis,
            consequences=consequences,
            possible_resolution=resolution,
        )
    except (EventNotFound, EntityNotFound) as exc:
        raise HTTPException(status_code=404, detail="Change target entity not found") from exc
    except (
        EntityOwnershipError,
        InvalidEntityIdentifier,
        InvalidChangeValue,
        UnchangedValue,
        UnsupportedChangeField,
        UnsupportedEntityType,
    ) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _transition_change_request(
    request_id: str, target_status: str, db: Session
) -> ChangeRequestModel:
    result = db.execute(
        update(ChangeRequestModel)
        .where(ChangeRequestModel.id == request_id, ChangeRequestModel.status == "PENDING")
        .values(status=target_status)
    )
    if result.rowcount == 0:
        db.rollback()
        change_request = db.get(ChangeRequestModel, request_id)
        if change_request is None:
            raise HTTPException(status_code=404, detail="Change request not found")
        raise HTTPException(
            status_code=409,
            detail=f"Only PENDING change requests can transition to {target_status}",
        )
    db.commit()
    return db.get(ChangeRequestModel, request_id)


@router.post(
    "/change-requests/{request_id}/reject",
    response_model=ChangeRequestRejectionResponse,
)
def reject_change_request(
    request_id: str, db: Session = Depends(get_db)
) -> ChangeRequestRejectionResponse:
    rejected_request = _transition_change_request(request_id, "REJECTED", db)
    try:
        notion_sync_result = sync_change_request_to_notion(rejected_request)
    except Exception as exc:
        logger.exception("Notion sync failed after rejecting change request %s", request_id)
        notion_sync_result = NotionSyncResult(
            change_id=rejected_request.id,
            success=False,
            failures=[
                NotionSyncFailure(
                    record_type="changes",
                    record_id=rejected_request.id,
                    error=f"Unexpected {type(exc).__name__}",
                )
            ],
        )
    return ChangeRequestRejectionResponse(
        request=rejected_request,
        notion_sync=notion_sync_result.model_dump(),
    )


@router.post(
    "/change-requests/{request_id}/accept",
    response_model=ChangeRequestApprovalResponse,
)
def accept_change_request(
    request_id: str, db: Session = Depends(get_db)
) -> ChangeRequestApprovalResponse:
    change_request = db.get(ChangeRequestModel, request_id)
    if change_request is None:
        raise HTTPException(status_code=404, detail="Change request not found")
    if change_request.status != "PENDING":
        raise HTTPException(
            status_code=409,
            detail="Only PENDING change requests can be accepted",
        )

    execution_data = {
        "event_id": change_request.event_id,
        "entity_type": change_request.entity_type,
        "entity_id": change_request.entity_id,
        "field_name": change_request.field_name,
        "new_value": change_request.new_value,
        "reason": change_request.reason,
        "created_by": change_request.created_by,
    }
    transitioned = db.execute(
        update(ChangeRequestModel)
        .where(ChangeRequestModel.id == request_id, ChangeRequestModel.status == "PENDING")
        .values(status="PROCESSING")
    )
    if transitioned.rowcount != 1:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Only PENDING change requests can be accepted",
        )
    db.commit()

    try:
        result = process_change(db, **execution_data)
    except Exception as exc:
        db.rollback()
        db.execute(
            update(ChangeRequestModel)
            .where(ChangeRequestModel.id == request_id, ChangeRequestModel.status == "PROCESSING")
            .values(status="FAILED")
        )
        db.commit()
        if isinstance(exc, (InvalidChangeValue, UnchangedValue, UnsupportedChangeField, UnsupportedEntityType)):
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if isinstance(exc, (EventNotFound, EntityNotFound)):
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if isinstance(exc, (EntityOwnershipError, InvalidEntityIdentifier)):
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if isinstance(exc, SQLAlchemyError):
            logger.exception("Approved change request execution failed: %s", request_id)
            raise HTTPException(status_code=500, detail="Change request execution failed") from exc
        logger.exception("Unexpected approved change request failure: %s", request_id)
        raise HTTPException(status_code=500, detail="Change request execution failed") from exc

    db.execute(
        update(ChangeRequestModel)
        .where(ChangeRequestModel.id == request_id, ChangeRequestModel.status == "PROCESSING")
        .values(status="APPLIED")
    )
    db.commit()
    applied_request = db.get(ChangeRequestModel, request_id)
    notion_sync_result: NotionSyncResult
    try:
        applied_change = db.get(Change, result.change_id)
        if applied_change is None:
            raise EntityNotFound("Applied change audit record not found")
        notion_sync_result = sync_change_to_notion(
            db,
            applied_change,
            result,
            change_request=applied_request,
        )
    except Exception as exc:
        logger.exception("Notion sync failed after applying change request %s", request_id)
        notion_sync_result = NotionSyncResult(
            change_id=result.change_id,
            success=False,
            failures=[
                NotionSyncFailure(
                    record_type="changes",
                    record_id=result.change_id,
                    error=f"Unexpected {type(exc).__name__}",
                )
            ],
        )
    return ChangeRequestApprovalResponse(
        request=applied_request,
        result=result,
        notion_sync=notion_sync_result.model_dump(),
    )


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


@router.get("/changes/{change_id}/tasks", response_model=list[TaskDetail])
def get_change_tasks(change_id: str, db: Session = Depends(get_db)) -> list[Task]:
    change = db.get(Change, change_id)
    if change is None:
        raise HTTPException(status_code=404, detail="Change not found")
    try:
        return list_tasks_for_change(db, reconstruct_verified_impact(db, change))
    except (EntityNotFound, UnsupportedEntityType) as exc:
        raise HTTPException(status_code=404, detail="Change target entity not found") from exc


@router.get("/changes/{change_id}/risks", response_model=list[RiskRead])
def get_change_risks(change_id: str, db: Session = Depends(get_db)) -> list[Risk]:
    change = db.get(Change, change_id)
    if change is None:
        raise HTTPException(status_code=404, detail="Change not found")
    try:
        return list_risks_for_change(db, reconstruct_verified_impact(db, change))
    except (EntityNotFound, UnsupportedEntityType) as exc:
        raise HTTPException(status_code=404, detail="Change target entity not found") from exc


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


@router.post("/changes/{change_id}/sync-notion", response_model=NotionSyncResult)
def sync_change_to_notion_api(
    change_id: str, db: Session = Depends(get_db)
) -> NotionSyncResult:
    change = db.get(Change, change_id)
    if change is None:
        raise HTTPException(status_code=404, detail="Change not found")
    try:
        verified = reconstruct_verified_impact(db, change)
    except EntityNotFound as exc:
        raise HTTPException(status_code=404, detail="Change target entity not found") from exc
    except UnsupportedEntityType as exc:
        raise HTTPException(status_code=422, detail="Unsupported change target entity") from exc
    except SQLAlchemyError as exc:
        logger.exception("Verified impact reconstruction failed for Notion sync %s", change_id)
        raise HTTPException(status_code=500, detail="Notion sync preparation failed") from exc
    return sync_change_to_notion(db, change, verified)


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


@router.get("/events/{event_id}/tasks", response_model=list[TaskDetail])
def get_event_tasks(event_id: str, db: Session = Depends(get_db)) -> list[Task]:
    try:
        return list_event_tasks(db, event_id)
    except TaskEventNotFound as exc:
        raise HTTPException(status_code=404, detail="Event not found") from exc


@router.post("/events/{event_id}/tasks", response_model=TaskDetail, status_code=201)
def post_event_task(event_id: str, request: TaskCreate, db: Session = Depends(get_db)) -> Task:
    try:
        return create_task(db, event_id, request)
    except TaskEventNotFound as exc:
        raise HTTPException(status_code=404, detail="Event not found") from exc
    except TaskReferenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except TaskOwnershipError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/tasks/{task_id}", response_model=TaskDetail)
def get_one_task(task_id: str, db: Session = Depends(get_db)) -> Task:
    try:
        return get_task(db, task_id)
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail="Task not found") from exc


@router.patch("/tasks/{task_id}", response_model=TaskDetail)
def patch_task(task_id: str, request: TaskUpdate, db: Session = Depends(get_db)) -> Task:
    try:
        return update_task(db, task_id, request)
    except TaskNotFound as exc:
        raise HTTPException(status_code=404, detail="Task not found") from exc
    except TaskReferenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (TaskOwnershipError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/volunteers/{volunteer_id}/tasks", response_model=list[TaskDetail])
def get_volunteer_tasks(volunteer_id: str, db: Session = Depends(get_db)) -> list[Task]:
    try:
        return list_volunteer_tasks(db, volunteer_id)
    except TaskReferenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/events/{event_id}/risks", response_model=list[RiskRead])
def get_event_risks(event_id: str, db: Session = Depends(get_db)) -> list[Risk]:
    try:
        return list_event_risks(db, event_id)
    except RiskEventNotFound as exc:
        raise HTTPException(status_code=404, detail="Event not found") from exc


@router.post("/events/{event_id}/risks", response_model=RiskRead, status_code=201)
def post_event_risk(event_id: str, request: RiskCreate, db: Session = Depends(get_db)) -> Risk:
    try:
        return create_risk(db, event_id, request)
    except RiskEventNotFound as exc:
        raise HTTPException(status_code=404, detail="Event not found") from exc
    except RiskReferenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RiskOwnershipError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/risks/{risk_id}", response_model=RiskRead)
def get_one_risk(risk_id: str, db: Session = Depends(get_db)) -> Risk:
    try:
        return get_risk(db, risk_id)
    except RiskNotFound as exc:
        raise HTTPException(status_code=404, detail="Risk not found") from exc


@router.patch("/risks/{risk_id}", response_model=RiskRead)
def patch_risk(risk_id: str, request: RiskUpdate, db: Session = Depends(get_db)) -> Risk:
    try:
        return update_risk(db, risk_id, request)
    except RiskNotFound as exc:
        raise HTTPException(status_code=404, detail="Risk not found") from exc
    except RiskReferenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (RiskOwnershipError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/events/{event_id}/dashboard", response_model=EventDashboard)
def get_event_dashboard(event_id: str, db: Session = Depends(get_db)) -> EventDashboard:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    sessions = list(db.scalars(select(EventSession).where(EventSession.event_id == event_id)).all())
    task_rows = list(db.scalars(select(Task).where(Task.event_id == event_id)).all())
    risk_rows = list(db.scalars(select(Risk).where(Risk.event_id == event_id)).all())
    changes = list(
        db.scalars(
            select(Change).where(Change.event_id == event_id)
            .order_by(Change.created_at.desc(), Change.id.desc()).limit(5)
        ).all()
    )
    conflicts_by_key = {}
    for session in sessions:
        for conflict in detect_conflicts(
            db,
            event_id=event_id,
            entity_type="session",
            entity=session,
            field_name="venue_id",
            new_value=session.venue_id,
        ):
            conflicts_by_key[(conflict.type, tuple(conflict.entity_ids))] = conflict

    active_risks = [risk for risk in risk_rows if risk.status not in {"closed", "mitigated"}]
    tasks = {
        "total": len(task_rows),
        "todo": sum(task.status in {"open", "todo"} for task in task_rows),
        "in_progress": sum(task.status == "in_progress" for task in task_rows),
        "blocked": sum(task.status == "blocked" for task in task_rows),
        "done": sum(task.status == "done" for task in task_rows),
        "cancelled": sum(task.status == "cancelled" for task in task_rows),
    }
    return EventDashboard(
        event_id=event_id,
        sessions={"total": len(sessions)},
        tasks=tasks,
        risks={
            "total": len(risk_rows),
            "open": sum(risk.status == "open" for risk in risk_rows),
            "high": sum(
                risk.severity in {"high", "critical"} for risk in active_risks
            ),
        },
        recent_changes=changes,
        active_conflicts=sorted(conflicts_by_key.values(), key=lambda item: (item.type, item.entity_ids)),
    )
