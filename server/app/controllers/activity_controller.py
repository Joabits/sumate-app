from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status

from app.core.database import DBSession
from app.core.geocoding import reverse_geocode
from app.core.security import CurrentUser
from app.core.storage import delete_activity_image, save_activity_image
from app.models.activity import Activity
from app.models.activity_detail import ActivityDetail
from app.models.activity_search import SearchFilters, search_activities as search
from app.models.cause import ActivityCause, Cause
from app.models.exceptions import (
    ActivityNotFoundException,
    InvalidActivityImageException,
    ValidationException,
)
from app.models.participation import EstadoParticipacion, Participation
from app.views.activity_view import (
    ActivityDetailRead,
    ActivityListRead,
    CancelarActividadRequest,
    CapacityRangeFilter,
    CreateActivityRequest,
    DatePresetFilter,
    MyActivityListRead,
    TimeOfDayFilter,
    UpdateActivityCapacityRequest,
    UpdateActivityInfoRequest,
    UpdateDescriptionRequest,
    UpdateLocationRequest,
    render_activity_detail,
    render_activity_list,
    render_my_activities,
)
from app.views.cause_view import ReplaceActivityCausesRequest

router = APIRouter(prefix="/activities", tags=["Actividades"])

MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024


# ── Ayudantes del controlador ─────────────────────────────────────────────────
async def _save_cover(image: UploadFile) -> str:
    """Valida la imagen subida, la guarda y devuelve su URL pública."""
    content = await image.read()
    if not content:
        raise InvalidActivityImageException("El archivo de imagen no puede estar vacío.")
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise InvalidActivityImageException("La imagen no debe superar los 2MB.")
    try:
        return save_activity_image(content, filename=image.filename)
    except ValueError as exc:
        raise InvalidActivityImageException(str(exc))
    except OSError:
        raise InvalidActivityImageException("No se pudo guardar la imagen en el servidor.")


def _owned_activity(
    session: DBSession,
    activity_id: UUID,
    user_id: str,
    message: str,
    *,
    for_update: bool = False,
) -> Activity:
    """La actividad, solo si quien pide es su organizador."""
    activity = Activity.get_or_404(session, activity_id, for_update=for_update)
    activity.ensure_owner(user_id, message)
    return activity


def _list_view(session: DBSession, activities: list[Activity]) -> ActivityListRead:
    ids = [activity.id for activity in activities]
    return render_activity_list(
        activities,
        Cause.of_activities(session, ids),
        Participation.count_accepted_by_activity(session, ids),
    )


# ── Crear ─────────────────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear una nueva actividad")
async def create_activity(
    payload: Annotated[CreateActivityRequest, Depends(CreateActivityRequest.as_form)],
    current_user: CurrentUser,
    session: DBSession,
    image: Annotated[UploadFile, File(description="Imagen de la actividad")] = ...,
) -> Response:
    image_url = await _save_cover(image)
    try:
        activity = Activity.create(
            name=payload.name,
            owner_id=current_user.user_id,
            image_url=image_url,
            date=payload.date,
            capacity=payload.capacity,
        )
        session.add(activity)
        session.commit()
    except Exception:
        # Si la actividad no se guardó, la imagen subida ya no sirve
        delete_activity_image(image_url)
        raise
    return Response(status_code=status.HTTP_201_CREATED)


# ── Listas ────────────────────────────────────────────────────────────────────
@router.get("/explore", response_model=ActivityListRead, summary="Listar actividades para explorar")
def list_explore_activities(current_user: CurrentUser, session: DBSession) -> ActivityListRead:
    activities = Activity.list_explore(
        session,
        exclude_owner_id=current_user.user_id,
        min_date=datetime.now(timezone.utc),
    )
    return _list_view(session, activities)


@router.get("/my-activities", response_model=MyActivityListRead, summary="Listar mis actividades")
def list_my_activities(current_user: CurrentUser, session: DBSession) -> MyActivityListRead:
    activities = Activity.list_by_owner(session, current_user.user_id)
    ids = [activity.id for activity in activities]
    return render_my_activities(
        activities,
        Cause.of_activities(session, ids),
        Participation.count_accepted_by_activity(session, ids),
    )


@router.get(
    "/search",
    response_model=ActivityListRead,
    summary="Buscar actividades con filtros avanzados",
)
def search_activities(
    session: DBSession,
    q: Annotated[str | None, Query(description="Término de búsqueda por nombre, causa o lugar de la actividad")] = None,
    time_of_day: Annotated[TimeOfDayFilter, Query(description="Filtro de momento del día")] = TimeOfDayFilter.any,
    date_preset: Annotated[DatePresetFilter, Query(description="Filtro de temporalidad de fecha")] = DatePresetFilter.upcoming,
    capacity_range: Annotated[CapacityRangeFilter, Query(description="Filtro de plazas/cupos totales configurados")] = CapacityRangeFilter.any,
    cause_ids: Annotated[list[UUID], Query(description="Lista de IDs de causas para filtrar")] = [],
    user_lat: Annotated[float | None, Query(description="Latitud actual del usuario")] = None,
    user_lon: Annotated[float | None, Query(description="Longitud actual del usuario")] = None,
    max_distance_km: Annotated[float | None, Query(description="Radio máximo en kilómetros")] = None,
) -> ActivityListRead:
    filters = SearchFilters(
        query=q,
        time_of_day=time_of_day.value if time_of_day else None,
        date_preset=date_preset.value if date_preset else None,
        capacity_range=capacity_range.value if capacity_range else None,
        cause_ids=tuple(cause_ids),
        user_latitude=user_lat,
        user_longitude=user_lon,
        max_distance_km=max_distance_km,
    )
    activities = search(session, filters, min_date=datetime.now(timezone.utc))
    return _list_view(session, activities)


# ── Detalle ───────────────────────────────────────────────────────────────────
@router.get(
    "/{activity_id}",
    response_model=ActivityDetailRead,
    summary="Obtener detalle de una actividad",
    description="Retorna el detalle completo de la actividad. Si es borrador, solo el creador tiene acceso.",
)
def get_activity_detail(
    activity_id: UUID, current_user: CurrentUser, session: DBSession
) -> ActivityDetailRead:
    user_id = current_user.user_id
    activity = Activity.get_or_404(session, activity_id)
    is_owner = activity.is_owner(user_id)
    # Un borrador solo lo ve quien lo creó
    if activity.is_draft and not is_owner:
        raise ActivityNotFoundException()

    mi_solicitud = Participation.get_of_user(session, activity_id, user_id) if user_id else None
    estado_solicitud = mi_solicitud.status if mi_solicitud else None
    en_espera_yo = estado_solicitud == EstadoParticipacion.EN_ESPERA

    # Solo el organizador ve las solicitudes pendientes, la lista de espera y los cancelados
    en_espera = (
        Participation.list_waiting(session, activity_id) if is_owner or en_espera_yo else []
    )
    # El voluntario solo ve su puesto, no los nombres de los demás
    posicion_en_espera = next(
        (puesto for puesto, p in enumerate(en_espera, start=1) if p.user_id == user_id),
        None,
    )

    return render_activity_detail(
        activity,
        detail=ActivityDetail.of_activity(session, activity_id),
        causes=Cause.of_activity(session, activity_id),
        is_owner=is_owner,
        estado_solicitud=estado_solicitud,
        is_participating=estado_solicitud == EstadoParticipacion.ACEPTADA,
        participants=Participation.list_by_status(session, activity_id, EstadoParticipacion.ACEPTADA),
        solicitudes_pendientes=(
            Participation.list_by_status(session, activity_id, EstadoParticipacion.PENDIENTE)
            if is_owner
            else []
        ),
        posicion_en_espera=posicion_en_espera,
        lista_de_espera=en_espera if is_owner else [],
        postulantes_cancelados=(
            Participation.list_by_status(session, activity_id, EstadoParticipacion.CANCELADA)
            if is_owner and activity.is_cancelled
            else []
        ),
    )


# ── Edición (solo el organizador) ─────────────────────────────────────────────
@router.patch("/{activity_id}/location", status_code=status.HTTP_200_OK, summary="Actualizar ubicación de la actividad")
async def update_activity_location(
    activity_id: UUID,
    payload: UpdateLocationRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    _owned_activity(
        session, activity_id, current_user.user_id, "Solo el organizador puede editar la ubicación."
    )
    _, address = await reverse_geocode(payload.latitude, payload.longitude)
    place = (payload.place or "").strip() or "Ubicación por definir"

    detail = ActivityDetail.of_activity(session, activity_id)
    if detail is None:
        detail = ActivityDetail.create(
            activity_id=activity_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            place=place,
            address=address,
        )
        session.add(detail)
    else:
        detail.update_location(
            latitude=payload.latitude, longitude=payload.longitude, place=place, address=address
        )
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/description", status_code=status.HTTP_200_OK, summary="Actualizar descripción de la actividad")
def update_activity_description(
    activity_id: UUID,
    payload: UpdateDescriptionRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    _owned_activity(
        session, activity_id, current_user.user_id, "Solo el organizador puede editar la descripción."
    )
    detail = ActivityDetail.of_activity(session, activity_id)
    if detail is None:
        session.add(ActivityDetail.create(activity_id=activity_id, description=payload.description))
    else:
        detail.update_description(payload.description)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/image", status_code=status.HTTP_200_OK, summary="Reemplazar imagen de portada de la actividad")
async def update_activity_image(
    activity_id: UUID,
    current_user: CurrentUser,
    session: DBSession,
    image: Annotated[UploadFile, File(description="Nueva imagen de portada")],
) -> Response:
    image_url = await _save_cover(image)
    try:
        activity = _owned_activity(
            session, activity_id, current_user.user_id, "Solo el organizador puede editar la imagen."
        )
        previous_image_url = activity.update_image(image_url)
        session.commit()
    except Exception:
        delete_activity_image(image_url)
        raise
    # La imagen anterior ya no la usa nadie
    delete_activity_image(previous_image_url)
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/info", status_code=status.HTTP_200_OK, summary="Actualizar datos base (título, fecha)")
def update_activity_info(
    activity_id: UUID,
    payload: UpdateActivityInfoRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    activity = _owned_activity(
        session,
        activity_id,
        current_user.user_id,
        "Solo el organizador puede editar los datos de la actividad.",
    )
    activity.update_info(name=payload.name, date=payload.date)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.patch("/{activity_id}/capacity", status_code=status.HTTP_200_OK, summary="Actualizar cupos de la actividad")
def update_activity_capacity(
    activity_id: UUID,
    payload: UpdateActivityCapacityRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    activity = _owned_activity(
        session,
        activity_id,
        current_user.user_id,
        "Solo el organizador puede editar los cupos de la actividad.",
        for_update=True,
    )
    activity.update_capacity(
        payload.capacity, registered_count=Participation.count_accepted(session, activity_id)
    )
    # Si hay cupos nuevos, entran los primeros de la lista de espera
    Participation.llenar_cupos_desde_lista_de_espera(session, activity)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.put("/{activity_id}/causes", status_code=status.HTTP_200_OK, summary="Asignar o actualizar causas asociadas a una actividad")
def replace_activity_causes(
    activity_id: UUID,
    payload: ReplaceActivityCausesRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    activity = _owned_activity(
        session,
        activity_id,
        current_user.user_id,
        "Solo el organizador puede modificar las causas.",
        for_update=True,
    )
    if activity.is_active and not payload.cause_ids:
        raise ValidationException(
            "Una actividad publicada debe mantener al menos una causa asignada."
        )
    cause_ids = list(dict.fromkeys(payload.cause_ids))
    if len(Cause.get_by_ids(session, cause_ids)) != len(cause_ids):
        raise ValidationException("Una o más causas seleccionadas no existen en el catálogo.")

    ActivityCause.replace(session, activity.id, cause_ids)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


# ── Estado de la convocatoria ─────────────────────────────────────────────────
@router.post("/{activity_id}/publish", status_code=status.HTTP_200_OK, summary="Publicar actividad")
def publish_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    activity = _owned_activity(
        session, activity_id, current_user.user_id, "Solo el organizador puede publicar la actividad."
    )
    activity.publish(
        ActivityDetail.of_activity(session, activity_id),
        Cause.of_activity(session, activity_id),
    )
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.post("/{activity_id}/close", status_code=status.HTTP_200_OK, summary="Cerrar convocatoria de la actividad")
def close_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    activity = _owned_activity(
        session,
        activity_id,
        current_user.user_id,
        "Solo el organizador puede cerrar la convocatoria.",
        for_update=True,
    )
    activity.close()
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.post("/{activity_id}/reopen", status_code=status.HTTP_200_OK, summary="Reabrir convocatoria de la actividad")
def reopen_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    activity = _owned_activity(
        session, activity_id, current_user.user_id, "Solo el organizador puede reabrir la convocatoria."
    )
    activity.reopen()
    session.commit()
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
    session: DBSession,
) -> Response:
    # FOR UPDATE: nadie acepta ni se une mientras se cancela
    activity = _owned_activity(
        session,
        activity_id,
        current_user.user_id,
        "Solo el organizador puede cancelar la actividad.",
        for_update=True,
    )
    activity.cancelar(payload.motivo)
    # Pendientes, aceptadas y en espera pasan a canceladas y guardan su estado anterior
    for solicitud in Participation.list_applicants(session, activity_id):
        solicitud.cancelar_por_organizacion()
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar físicamente una actividad")
def delete_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    activity = _owned_activity(
        session,
        activity_id,
        current_user.user_id,
        "Solo el organizador puede eliminar la actividad.",
        for_update=True,
    )
    activity.ensure_can_be_deleted(Participation.count_accepted(session, activity_id))
    image_url = activity.image_url

    Participation.delete_unconfirmed(session, activity_id)
    activity.delete_with_relations(session)
    session.commit()

    delete_activity_image(image_url)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
