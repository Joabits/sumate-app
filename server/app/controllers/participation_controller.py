from uuid import UUID

from fastapi import APIRouter, Response, status

from app.core.dependencies import ParticipationServiceDep
from app.core.security import CurrentUser
from app.dtos.participation_dto import ParticipatedActivityListRead

router = APIRouter(prefix="/participaciones", tags=["Participaciones"])


@router.get(
    "/me",
    response_model=ParticipatedActivityListRead,
    summary="Listar actividades en las que participa el usuario",
)
def list_my_participations(
    current_user: CurrentUser, service: ParticipationServiceDep
) -> ParticipatedActivityListRead:
    return service.listar_mis_solicitudes(current_user.user_id)


@router.post("/{activity_id}", status_code=status.HTTP_201_CREATED, summary="Unirse a una actividad")
def join_activity(
    activity_id: UUID, current_user: CurrentUser, service: ParticipationServiceDep
) -> Response:
    service.solicitar(activity_id, current_user.user_id)
    return Response(status_code=status.HTTP_201_CREATED)


@router.delete("/{activity_id}", status_code=status.HTTP_200_OK, summary="Cancelar participación en una actividad")
def leave_activity(
    activity_id: UUID, current_user: CurrentUser, service: ParticipationServiceDep
) -> Response:
    service.salir(activity_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/solicitudes/{participante_id}/aceptar",
    status_code=status.HTTP_200_OK,
    summary="Aceptar una solicitud de participación (solo organizador)",
)
def aceptar_solicitud(
    activity_id: UUID,
    participante_id: str,
    current_user: CurrentUser,
    service: ParticipationServiceDep,
) -> Response:
    service.aceptar_solicitud(activity_id, participante_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/solicitudes/{participante_id}/rechazar",
    status_code=status.HTTP_200_OK,
    summary="Rechazar una solicitud de participación (solo organizador)",
)
def rechazar_solicitud(
    activity_id: UUID,
    participante_id: str,
    current_user: CurrentUser,
    service: ParticipationServiceDep,
) -> Response:
    service.rechazar_solicitud(activity_id, participante_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)
