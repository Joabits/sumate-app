from uuid import UUID

from app.core.dependencies import CurrentUser, DBSession, UoWDep
from app.modules.activities.infrastructure.persistence.repositories.sqlmodel_activity_repository import (
    SQLModelActivityRepository,
)
from app.modules.participations.application.queries.list_user_participations import (
    ListUserParticipationsQuery,
    ListUserParticipationsQueryHandler,
)
from app.modules.participations.application.use_cases.join_activity import (
    JoinActivityCommand,
    JoinActivityUseCase,
)
from app.modules.participations.application.use_cases.leave_activity import (
    LeaveActivityCommand,
    LeaveActivityUseCase,
)
from app.modules.activities.infrastructure.api.schemas.cause_schemas import (
    CauseRead,
)
from app.modules.participations.infrastructure.api.schemas.participation_schemas import (
    ParticipatedActivityItemRead,
    ParticipatedActivityListRead,
)
from app.modules.participations.infrastructure.persistence.repositories.sqlmodel_participation_repository import (
    SQLModelParticipationRepository,
)
from fastapi import APIRouter, Response, status

router = APIRouter(prefix="/participations", tags=["Participaciones"])


@router.get(
    "/me",
    response_model=ParticipatedActivityListRead,
    summary="Listar actividades en las que participa el usuario",
)
def list_my_participations(
    current_user: CurrentUser,
    db: DBSession,
) -> ParticipatedActivityListRead:
    participation_repo = SQLModelParticipationRepository(db)
    activity_repo = SQLModelActivityRepository(db)
    handler = ListUserParticipationsQueryHandler(participation_repo, activity_repo)
    dto = handler.execute(ListUserParticipationsQuery(user_id=current_user.user_id))
    return ParticipatedActivityListRead(
        items=[
            ParticipatedActivityItemRead(
                id=item.id,
                name=item.name,
                image_url=item.image_url,
                date=item.date,
                owner_id=item.owner_id,
                capacity=item.capacity,
                status=item.status,
                enrolled_date=item.enrolled_date,
                is_past=item.is_past,
                creator_name=item.creator_name,
                creator_image=item.creator_image,
                causes=[
                    CauseRead(id=c.id, name=c.name, slug=c.slug)
                    for c in item.causes
                ],
            )
            for item in dto.items
        ]
    )


@router.post(
    "/{activity_id}",
    status_code=status.HTTP_201_CREATED,
    summary="Unirse a una actividad",
)
def join_activity(
    activity_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
    uow: UoWDep,
) -> Response:
    activity_repo = SQLModelActivityRepository(db)
    participation_repo = SQLModelParticipationRepository(db)
    use_case = JoinActivityUseCase(
        activity_repository=activity_repo,
        participation_repository=participation_repo,
        uow=uow,
    )
    use_case.execute(
        JoinActivityCommand(
            activity_id=activity_id,
            user_id=current_user.user_id,
        )
    )
    return Response(status_code=status.HTTP_201_CREATED)


@router.delete(
    "/{activity_id}",
    status_code=status.HTTP_200_OK,
    summary="Cancelar participación en una actividad",
)
def leave_activity(
    activity_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
    uow: UoWDep,
) -> Response:
    activity_repo = SQLModelActivityRepository(db)
    participation_repo = SQLModelParticipationRepository(db)
    use_case = LeaveActivityUseCase(
        activity_repository=activity_repo,
        participation_repository=participation_repo,
        uow=uow,
    )
    use_case.execute(
        LeaveActivityCommand(
            activity_id=activity_id,
            user_id=current_user.user_id,
        )
    )
    return Response(status_code=status.HTTP_200_OK)
