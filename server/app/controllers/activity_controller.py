from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from app.core.dependencies import ActivityServiceDep
from app.core.security import CurrentUser
from app.dtos.activity_dto import (
    ActivityDetailRead,
    ActivityListRead,
    CancelarActividadRequest,
    CapacityRangeFilter,
    CreateActivityRequest,
    DatePresetFilter,
    MyActivityListRead,
    SearchFilters,
    TimeOfDayFilter,
    UpdateActivityCapacityRequest,
    UpdateActivityInfoRequest,
    UpdateDescriptionRequest,
    UpdateLocationRequest,
)
from app.dtos.cause_dto import ReplaceActivityCausesRequest

router = APIRouter(prefix="/activities", tags=["Actividades"])


# ── Crear ─────────────────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear una nueva actividad")
async def create_activity(
    payload: Annotated[CreateActivityRequest, Depends(CreateActivityRequest.as_form)],
    current_user: CurrentUser,
    service: ActivityServiceDep,
    image: Annotated[UploadFile, File(description="Imagen de la actividad")] = ...,
) -> Response:
    service.crear(current_user.user_id, payload, await image.read(), image.filename)
    return Response(status_code=status.HTTP_201_CREATED)


# ── Listas ────────────────────────────────────────────────────────────────────
@router.get("/explore", response_model=ActivityListRead, summary="Listar actividades para explorar")
def list_explore_activities(current_user: CurrentUser, service: ActivityServiceDep) -> ActivityListRead:
    return service.listar_explorar(current_user.user_id)


@router.get("/my-activities", response_model=MyActivityListRead, summary="Listar mis actividades")
def list_my_activities(current_user: CurrentUser, service: ActivityServiceDep) -> MyActivityListRead:
    return service.listar_mias(current_user.user_id)


@router.get(
    "/search",
    response_model=ActivityListRead,
    summary="Buscar actividades con filtros avanzados",
)
def search_activities(
    service: ActivityServiceDep,
    q: Annotated[str | None, Query(description="Término de búsqueda por nombre, causa o lugar de la actividad")] = None,
    time_of_day: Annotated[TimeOfDayFilter, Query(description="Filtro de momento del día")] = TimeOfDayFilter.any,
    date_preset: Annotated[DatePresetFilter, Query(description="Filtro de temporalidad de fecha")] = DatePresetFilter.upcoming,
    capacity_range: Annotated[CapacityRangeFilter, Query(description="Filtro de plazas/cupos totales configurados")] = CapacityRangeFilter.any,
    cause_ids: Annotated[list[UUID], Query(description="Lista de IDs de causas para filtrar")] = [],
    user_lat: Annotated[float | None, Query(description="Latitud actual del usuario")] = None,
    user_lon: Annotated[float | None, Query(description="Longitud actual del usuario")] = None,
    max_distance_km: Annotated[float | None, Query(description="Radio máximo en kilómetros")] = None,
) -> ActivityListRead:
    return service.buscar(
        SearchFilters(
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


# ── Detalle ───────────────────────────────────────────────────────────────────
@router.get(
    "/{activity_id}",
    response_model=ActivityDetailRead,
    summary="Obtener detalle de una actividad",
    description="Retorna el detalle completo de la actividad. Si es borrador, solo el creador tiene acceso.",
)
def get_activity_detail(
    activity_id: UUID, current_user: CurrentUser, service: ActivityServiceDep
) -> ActivityDetailRead:
    return service.obtener_detalle(activity_id, current_user.user_id)


# ── Edición (solo el organizador) ─────────────────────────────────────────────
@router.patch("/{activity_id}/location", status_code=status.HTTP_200_OK, summary="Actualizar ubicación de la actividad")
async def update_activity_location(
    activity_id: UUID,
    payload: UpdateLocationRequest,
    current_user: CurrentUser,
    service: ActivityServiceDep,
) -> Response:
    await service.actualizar_ubicacion(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/description", status_code=status.HTTP_200_OK, summary="Actualizar descripción de la actividad")
def update_activity_description(
    activity_id: UUID,
    payload: UpdateDescriptionRequest,
    current_user: CurrentUser,
    service: ActivityServiceDep,
) -> Response:
    service.actualizar_descripcion(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/image", status_code=status.HTTP_200_OK, summary="Reemplazar imagen de portada de la actividad")
async def update_activity_image(
    activity_id: UUID,
    current_user: CurrentUser,
    service: ActivityServiceDep,
    image: Annotated[UploadFile, File(description="Nueva imagen de portada")],
) -> Response:
    service.actualizar_portada(activity_id, current_user.user_id, await image.read(), image.filename)
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/info", status_code=status.HTTP_200_OK, summary="Actualizar datos base (título, fecha)")
def update_activity_info(
    activity_id: UUID,
    payload: UpdateActivityInfoRequest,
    current_user: CurrentUser,
    service: ActivityServiceDep,
) -> Response:
    service.actualizar_datos(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/capacity", status_code=status.HTTP_200_OK, summary="Actualizar cupos de la actividad")
def update_activity_capacity(
    activity_id: UUID,
    payload: UpdateActivityCapacityRequest,
    current_user: CurrentUser,
    service: ActivityServiceDep,
) -> Response:
    service.actualizar_cupos(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_200_OK)


@router.put("/{activity_id}/causes", status_code=status.HTTP_200_OK, summary="Asignar o actualizar causas asociadas a una actividad")
def replace_activity_causes(
    activity_id: UUID,
    payload: ReplaceActivityCausesRequest,
    current_user: CurrentUser,
    service: ActivityServiceDep,
) -> Response:
    service.reemplazar_causas(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_200_OK)


# ── Estado de la convocatoria ─────────────────────────────────────────────────
@router.post("/{activity_id}/publish", status_code=status.HTTP_200_OK, summary="Publicar actividad")
def publish_activity(activity_id: UUID, current_user: CurrentUser, service: ActivityServiceDep) -> Response:
    service.publicar(activity_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post("/{activity_id}/close", status_code=status.HTTP_200_OK, summary="Cerrar convocatoria de la actividad")
def close_activity(activity_id: UUID, current_user: CurrentUser, service: ActivityServiceDep) -> Response:
    service.cerrar(activity_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post("/{activity_id}/reopen", status_code=status.HTTP_200_OK, summary="Reabrir convocatoria de la actividad")
def reopen_activity(activity_id: UUID, current_user: CurrentUser, service: ActivityServiceDep) -> Response:
    service.reabrir(activity_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/cancelar",
    status_code=status.HTTP_200_OK,
    summary="Cancelar una actividad publicada con un motivo (solo organizador)",
)
def cancelar_actividad(
    activity_id: UUID,
    payload: CancelarActividadRequest,
    current_user: CurrentUser,
    service: ActivityServiceDep,
) -> Response:
    service.cancelar(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar físicamente una actividad")
def delete_activity(activity_id: UUID, current_user: CurrentUser, service: ActivityServiceDep) -> Response:
    service.eliminar(activity_id, current_user.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
