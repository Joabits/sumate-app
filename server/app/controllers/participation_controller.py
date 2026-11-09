from uuid import UUID

from fastapi import APIRouter, Response, status

from app.core.database import DBSession
from app.core.security import CurrentUser
from app.models.activity import Activity
from app.models.cause import Cause
from app.models.exceptions import (
    CannotLeavePastActivityException,
    NoEsOrganizadorException,
    ParticipationNotFoundException,
)
from app.models.participation import EstadoParticipacion, Participation
from app.views.participation_view import ParticipatedActivityListRead, render_trayectoria

router = APIRouter(prefix="/participaciones", tags=["Participaciones"])


@router.get(
    "/me",
    response_model=ParticipatedActivityListRead,
    summary="Listar actividades en las que participa el usuario",
)
def list_my_participations(
    current_user: CurrentUser, session: DBSession
) -> ParticipatedActivityListRead:
    participations = Participation.list_of_user(session, current_user.user_id)
    activity_ids = [p.activity_id for p in participations]
    return render_trayectoria(participations, Cause.of_activities(session, activity_ids))


@router.post("/{activity_id}", status_code=status.HTTP_201_CREATED, summary="Unirse a una actividad")
def join_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    # FOR UPDATE: dos voluntarios no toman el último cupo a la vez
    activity = Activity.get_or_404(session, activity_id, for_update=True)
    session.add(Participation.solicitar(session, activity, current_user.user_id))
    session.commit()
    return Response(status_code=status.HTTP_201_CREATED)


@router.delete("/{activity_id}", status_code=status.HTTP_200_OK, summary="Cancelar participación en una actividad")
def leave_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    # FOR UPDATE: nadie más toma el cupo mientras entra el primero en espera
    activity = Activity.get_or_404(session, activity_id, for_update=True)
    # Las solicitudes de una actividad cancelada se conservan en el historial
    activity.ensure_not_cancelled()
    if activity.has_passed():
        raise CannotLeavePastActivityException()

    solicitud = Participation.get_of_user(session, activity_id, current_user.user_id)
    # Una solicitud rechazada no se puede borrar: así no se puede volver a solicitar
    if solicitud is None or solicitud.estado == EstadoParticipacion.RECHAZADA:
        raise ParticipationNotFoundException()

    ocupaba_cupo = solicitud.estado == EstadoParticipacion.ACEPTADA
    session.delete(solicitud)
    # Si quien cancela ocupaba un cupo, entra el primero de la lista de espera
    if ocupaba_cupo:
        Participation.llenar_cupos_desde_lista_de_espera(session, activity)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


def _solicitud_a_revisar(
    session: DBSession, activity_id: UUID, participante_id: str, organizador_id: str
) -> tuple[Activity, Participation]:
    """Solo el organizador revisa las solicitudes de su actividad, si no está cancelada."""
    # FOR UPDATE sobre la actividad serializa las aceptaciones simultáneas
    activity = Activity.get_or_404(session, activity_id, for_update=True)
    if not activity.is_owner(organizador_id):
        raise NoEsOrganizadorException()
    # Después de cancelar no se acepta ni se rechaza a nadie
    activity.ensure_not_cancelled()
    return activity, Participation.get_of_user_or_404(session, activity_id, participante_id)


@router.post(
    "/{activity_id}/solicitudes/{participante_id}/aceptar",
    status_code=status.HTTP_200_OK,
    summary="Aceptar una solicitud de participación (solo organizador)",
)
def aceptar_solicitud(
    activity_id: UUID, participante_id: str, current_user: CurrentUser, session: DBSession
) -> Response:
    activity, solicitud = _solicitud_a_revisar(
        session, activity_id, participante_id, current_user.user_id
    )
    solicitud.aceptar_en(session, activity)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{activity_id}/solicitudes/{participante_id}/rechazar",
    status_code=status.HTTP_200_OK,
    summary="Rechazar una solicitud de participación (solo organizador)",
)
def rechazar_solicitud(
    activity_id: UUID, participante_id: str, current_user: CurrentUser, session: DBSession
) -> Response:
    _, solicitud = _solicitud_a_revisar(session, activity_id, participante_id, current_user.user_id)
    solicitud.rechazar()
    session.commit()
    return Response(status_code=status.HTTP_200_OK)
