from typing import Annotated
from uuid import UUID

from app.core.dependencies import CurrentUser, DBSession, UoWDep
from app.modules.activities.application.queries.get_activity_detail import (
    GetActivityDetailQuery,
    GetActivityDetailQueryHandler,
)
from app.modules.activities.application.queries.list_causes import (
    ListCausesQueryHandler,
)
from app.modules.activities.application.queries.list_explore_activities import (
    ListExploreActivitiesQuery,
    ListExploreActivitiesQueryHandler,
)
from app.modules.activities.application.queries.list_my_activities import (
    ListMyActivitiesQuery,
    ListMyActivitiesQueryHandler,
)
from app.modules.activities.application.queries.search_activities import (
    SearchActivitiesQuery,
    SearchActivitiesQueryHandler,
)
from app.modules.activities.application.use_cases.close_activity import (
    CloseActivityCommand,
    CloseActivityUseCase,
)
from app.modules.activities.application.use_cases.create_activity import (
    CreateActivityCommand,
    CreateActivityUseCase,
)
from app.modules.activities.application.use_cases.delete_activity import (
    DeleteActivityCommand,
    DeleteActivityUseCase,
)
from app.modules.activities.application.use_cases.publish_activity import (
    PublishActivityCommand,
    PublishActivityUseCase,
)
from app.modules.activities.application.use_cases.reopen_activity import (
    ReopenActivityCommand,
    ReopenActivityUseCase,
)
from app.modules.activities.application.use_cases.replace_activity_causes import (
    ReplaceActivityCausesCommand,
    ReplaceActivityCausesUseCase,
)
from app.modules.activities.application.use_cases.update_activity_capacity import (
    UpdateActivityCapacityCommand,
    UpdateActivityCapacityUseCase,
)
from app.modules.activities.application.use_cases.update_activity_description import (
    UpdateActivityDescriptionCommand,
    UpdateActivityDescriptionUseCase,
)
from app.modules.activities.application.use_cases.update_activity_image import (
    UpdateActivityImageCommand,
    UpdateActivityImageUseCase,
)
from app.modules.activities.application.use_cases.update_activity_info import (
    UpdateActivityInfoCommand,
    UpdateActivityInfoUseCase,
)
from app.modules.activities.application.use_cases.update_activity_location import (
    UpdateActivityLocationCommand,
    UpdateActivityLocationUseCase,
)
from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.infrastructure.api.schemas.activity_schemas import (
    ActivityDetailDataRead,
    ActivityDetailRead,
    ActivityListItemRead,
    ActivityListRead,
    ActivityParticipantRead,
    CapacityRangeFilter,
    CauseListRead,
    CauseRead,
    CreateActivityRequest,
    DatePresetFilter,
    MyActivityListItemRead,
    MyActivityListRead,
    ReplaceActivityCausesRequest,
    TimeOfDayFilter,
    UpdateActivityCapacityRequest,
    UpdateActivityInfoRequest,
    UpdateDescriptionRequest,
    UpdateLocationRequest,
)
from app.modules.activities.infrastructure.external.image_storage_service import (
    ImageStorageService,
)
from app.modules.activities.infrastructure.persistence.repositories.sqlmodel_activity_repository import (
    SQLModelActivityRepository,
)
from app.modules.activities.infrastructure.persistence.repositories.sqlmodel_cause_repository import (
    SQLModelCauseRepository,
)
from app.modules.participations.infrastructure.persistence.repositories.sqlmodel_participation_repository import (
    SQLModelParticipationRepository,
)
from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

router = APIRouter(prefix="/activities", tags=["Actividades"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva actividad",
)
async def create_activity(
    payload: Annotated[CreateActivityRequest, Depends(CreateActivityRequest.as_form)],
    current_user: CurrentUser,
    uow: UoWDep,
    image: Annotated[UploadFile, File(description="Imagen de la actividad")] = ...,
) -> Response:
    image_url = await ImageStorageService.upload_activity_cover(image)

    repository = SQLModelActivityRepository(uow.session)
    use_case = CreateActivityUseCase(repository, uow)
    try:
        use_case.execute(
            CreateActivityCommand(
                name=payload.name,
                owner_id=current_user.user_id,
                image_url=image_url,
                date=payload.date,
                capacity=payload.capacity,
            )
        )
    except Exception:
        # Si la actividad no se guardó, la imagen subida ya no sirve
        ImageStorageService.delete_activity_cover(image_url)
        raise

    return Response(status_code=status.HTTP_201_CREATED)


@router.get(
    "/causes",
    response_model=CauseListRead,
    summary="Listar catálogo de causas temáticas",
)
def list_causes(
    db: DBSession,
) -> CauseListRead:
    repository = SQLModelCauseRepository(db)
    handler = ListCausesQueryHandler(repository)
    dto = handler.execute()
    return CauseListRead(
        items=[
            CauseRead(id=c.id, name=c.name, slug=c.slug)
            for c in dto.items
        ]
    )


@router.get(
    "/explore",
    response_model=ActivityListRead,
    summary="Listar actividades para explorar",
)
def list_explore_activities(
    current_user: CurrentUser,
    db: DBSession,
) -> ActivityListRead:
    repository = SQLModelActivityRepository(db)
    handler = ListExploreActivitiesQueryHandler(repository)
    dto = handler.execute(
        ListExploreActivitiesQuery(
            current_user_id=current_user.user_id,
        )
    )

    return ActivityListRead(
        items=[
            ActivityListItemRead(
                id=item.id,
                name=item.name,
                image_url=item.image_url,
                date=item.date,
                owner_id=item.owner_id,
                capacity=item.capacity,
                status=item.status,
                creator_name=item.creator_name,
                creator_image=item.creator_image,
                causes=[
                    CauseRead(id=c.id, name=c.name, slug=c.slug)
                    for c in item.causes
                ],
                registered_count=item.registered_count,
            )
            for item in dto.items
        ]
    )


@router.get(
    "/my-activities",
    response_model=MyActivityListRead,
    summary="Listar mis actividades",
)
def list_my_activities(
    current_user: CurrentUser,
    db: DBSession,
) -> MyActivityListRead:
    repository = SQLModelActivityRepository(db)
    handler = ListMyActivitiesQueryHandler(repository)
    dto = handler.execute(
        ListMyActivitiesQuery(
            current_user_id=current_user.user_id,
        )
    )

    return MyActivityListRead(
        items=[
            MyActivityListItemRead(
                id=item.id,
                name=item.name,
                image_url=item.image_url,
                date=item.date,
                owner_id=item.owner_id,
                capacity=item.capacity,
                status=item.status,
                registered_count=item.registered_count,
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


@router.get(
    "/search",
    response_model=ActivityListRead,
    summary="Buscar actividades con filtros avanzados",
)
def search_activities(
    db: DBSession,
    q: Annotated[str | None, Query(description="Término de búsqueda por nombre, causa o lugar de la actividad")] = None,
    time_of_day: Annotated[TimeOfDayFilter, Query(description="Filtro de momento del día")] = TimeOfDayFilter.any,
    date_preset: Annotated[DatePresetFilter, Query(description="Filtro de temporalidad de fecha")] = DatePresetFilter.upcoming,
    capacity_range: Annotated[CapacityRangeFilter, Query(description="Filtro de plazas/cupos totales configurados")] = CapacityRangeFilter.any,
    cause_ids: Annotated[list[UUID], Query(description="Lista de IDs de causas para filtrar")] = [],
    user_lat: Annotated[float | None, Query(description="Latitud actual del usuario")] = None,
    user_lon: Annotated[float | None, Query(description="Longitud actual del usuario")] = None,
    max_distance_km: Annotated[float | None, Query(description="Radio máximo en kilómetros")] = None,
) -> ActivityListRead:
    repository = SQLModelActivityRepository(db)
    handler = SearchActivitiesQueryHandler(repository)
    dto = handler.execute(
        SearchActivitiesQuery(
            query=q,
            time_of_day=time_of_day.value if time_of_day else None,
            date_preset=date_preset.value if date_preset else None,
            capacity_range=capacity_range.value if capacity_range else None,
            cause_ids=tuple(cause_ids),
            user_latitude=user_lat,
            user_longitude=user_lon,
            max_distance_km=max_distance_km,
        )
    )

    return ActivityListRead(
        items=[
            ActivityListItemRead(
                id=item.id,
                name=item.name,
                image_url=item.image_url,
                date=item.date,
                owner_id=item.owner_id,
                capacity=item.capacity,
                status=item.status,
                creator_name=item.creator_name,
                creator_image=item.creator_image,
                causes=[
                    CauseRead(id=c.id, name=c.name, slug=c.slug)
                    for c in item.causes
                ],
                registered_count=item.registered_count,
            )
            for item in dto.items
        ]
    )


@router.get(
    "/{activity_id}",
    response_model=ActivityDetailRead,
    summary="Obtener detalle de una actividad",
    description="Retorna el detalle completo de la actividad. Si es borrador, solo el creador tiene acceso.",
)
def get_activity_detail(
    activity_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
) -> ActivityDetailRead:
    repository = SQLModelActivityRepository(db)
    participation_repo = SQLModelParticipationRepository(db)
    handler = GetActivityDetailQueryHandler(repository, participation_repo)
    dto = handler.execute(
        GetActivityDetailQuery(
            activity_id=activity_id,
            current_user_id=current_user.user_id,
        )
    )

    detail_data = (
        ActivityDetailDataRead(
            id=dto.detail.id,
            activity_id=dto.detail.activity_id,
            latitude=dto.detail.latitude,
            longitude=dto.detail.longitude,
            place=dto.detail.place,
            address=dto.detail.address,
            description=dto.detail.description,
        )
        if dto.detail
        else None
    )

    participants_data = [
        ActivityParticipantRead(
            id=p.id,
            name=p.name,
            image=p.image,
        )
        for p in dto.participants
    ]

    causes_data = [
        CauseRead(
            id=c.id,
            name=c.name,
            slug=c.slug,
        )
        for c in dto.causes
    ]

    return ActivityDetailRead(
        id=dto.id,
        name=dto.name,
        owner_id=dto.owner_id,
        creator_name=dto.creator_name,
        creator_image=dto.creator_image,
        image_url=dto.image_url,
        date=dto.date,
        capacity=dto.capacity,
        status=dto.status,
        is_owner=dto.is_owner,
        is_participating=dto.is_participating,
        participation_status=dto.participation_status,
        participants=participants_data,
        pending_requests=[
            ActivityParticipantRead(id=p.id, name=p.name, image=p.image)
            for p in dto.pending_requests
        ],
        detail=detail_data,
        causes=causes_data,
    )


@router.patch(
    "/{activity_id}/location",
    status_code=status.HTTP_200_OK,
    summary="Actualizar ubicación de la actividad",
)
async def update_activity_location(
    activity_id: UUID,
    payload: UpdateLocationRequest,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    repository = SQLModelActivityRepository(uow.session)
    use_case = UpdateActivityLocationUseCase(repository, uow)
    await use_case.execute(
        UpdateActivityLocationCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            place=payload.place,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.patch(
    "/{activity_id}/description",
    status_code=status.HTTP_200_OK,
    summary="Actualizar descripción de la actividad",
)
def update_activity_description(
    activity_id: UUID,
    payload: UpdateDescriptionRequest,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    repository = SQLModelActivityRepository(uow.session)
    use_case = UpdateActivityDescriptionUseCase(repository, uow)
    use_case.execute(
        UpdateActivityDescriptionCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
            description=payload.description,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.patch(
    "/{activity_id}/image",
    status_code=status.HTTP_200_OK,
    summary="Reemplazar imagen de portada de la actividad",
)
async def update_activity_image(
    activity_id: UUID,
    current_user: CurrentUser,
    uow: UoWDep,
    image: Annotated[UploadFile, File(description="Nueva imagen de portada")],
) -> Response:
    image_url = await ImageStorageService.upload_activity_cover(image)

    repository = SQLModelActivityRepository(uow.session)
    use_case = UpdateActivityImageUseCase(repository, uow)
    try:
        previous_image_url = use_case.execute(
            UpdateActivityImageCommand(
                activity_id=activity_id,
                owner_id=current_user.user_id,
                image_url=image_url,
            )
        )
    except Exception:
        ImageStorageService.delete_activity_cover(image_url)
        raise

    # La imagen anterior ya no la usa nadie
    ImageStorageService.delete_activity_cover(previous_image_url)
    return Response(status_code=status.HTTP_200_OK)


@router.patch(
    "/{activity_id}/info",
    status_code=status.HTTP_200_OK,
    summary="Actualizar datos base (título, fecha)",
)
def update_activity_info(
    activity_id: UUID,
    payload: UpdateActivityInfoRequest,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    repository = SQLModelActivityRepository(uow.session)
    use_case = UpdateActivityInfoUseCase(repository, uow)
    use_case.execute(
        UpdateActivityInfoCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
            name=payload.name,
            date=payload.date,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.patch(
    "/{activity_id}/capacity",
    status_code=status.HTTP_200_OK,
    summary="Actualizar cupos de la actividad",
)
def update_activity_capacity(
    activity_id: UUID,
    payload: UpdateActivityCapacityRequest,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    activity_repo = SQLModelActivityRepository(uow.session)
    participation_repo = SQLModelParticipationRepository(uow.session)
    use_case = UpdateActivityCapacityUseCase(
        activity_repository=activity_repo,
        participation_repository=participation_repo,
        uow=uow,
    )
    use_case.execute(
        UpdateActivityCapacityCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
            capacity=payload.capacity,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.put(
    "/{activity_id}/causes",
    status_code=status.HTTP_200_OK,
    summary="Asignar o actualizar causas asociadas a una actividad",
)
def replace_activity_causes(
    activity_id: UUID,
    payload: ReplaceActivityCausesRequest,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    activity_repo = SQLModelActivityRepository(uow.session)
    cause_repo = SQLModelCauseRepository(uow.session)
    use_case = ReplaceActivityCausesUseCase(
        activity_repository=activity_repo,
        cause_repository=cause_repo,
        uow=uow,
    )
    use_case.execute(
        ReplaceActivityCausesCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
            cause_ids=payload.cause_ids,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/publish",
    status_code=status.HTTP_200_OK,
    summary="Publicar actividad",
)
def publish_activity(
    activity_id: UUID,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    repository = SQLModelActivityRepository(uow.session)
    use_case = PublishActivityUseCase(repository, uow)
    use_case.execute(
        PublishActivityCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/close",
    status_code=status.HTTP_200_OK,
    summary="Cerrar convocatoria de la actividad",
)
def close_activity(
    activity_id: UUID,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    repository = SQLModelActivityRepository(uow.session)
    use_case = CloseActivityUseCase(repository, uow)
    use_case.execute(
        CloseActivityCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/reopen",
    status_code=status.HTTP_200_OK,
    summary="Reabrir convocatoria de la actividad",
)
def reopen_activity(
    activity_id: UUID,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    repository = SQLModelActivityRepository(uow.session)
    use_case = ReopenActivityUseCase(repository, uow)
    use_case.execute(
        ReopenActivityCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
        )
    )
    return Response(status_code=status.HTTP_200_OK)


@router.delete(
    "/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar físicamente una actividad",
)
def delete_activity(
    activity_id: UUID,
    current_user: CurrentUser,
    uow: UoWDep,
) -> Response:
    activity_repo = SQLModelActivityRepository(uow.session)
    participation_repo = SQLModelParticipationRepository(uow.session)
    use_case = DeleteActivityUseCase(
        activity_repository=activity_repo,
        participation_repository=participation_repo,
        uow=uow,
    )
    image_url = use_case.execute(
        DeleteActivityCommand(
            activity_id=activity_id,
            owner_id=current_user.user_id,
        )
    )
    ImageStorageService.delete_activity_cover(image_url)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


