from uuid import UUID

from fastapi import APIRouter, Response, status

from app.core.database import DBSession
from app.core.security import CurrentUser
from app.models.activity import Activity
from app.models.exceptions import ActivityNotFoundException, ValidationException
from app.models.participation import EstadoParticipacion, Participation
from app.models.registro_horas import RegistroHoras
from app.models.user import User
from app.views.horas_view import (
    ConstanciaRead,
    CorregirHorasRequest,
    HorasActividadRead,
    ReclamarHorasRequest,
    RegistrarJornadaRequest,
    render_constancia,
    render_horas_actividad,
)

router = APIRouter(prefix="/horas", tags=["Horas de voluntariado"])


@router.get(
    "/constancia",
    response_model=ConstanciaRead,
    summary="Constancia del voluntario: solo horas confirmadas",
)
def constancia(current_user: CurrentUser, session: DBSession) -> ConstanciaRead:
    user = session.get(User, current_user.user_id)
    return render_constancia(
        voluntario=user.name if user else current_user.email,
        correo=user.email if user else current_user.email,
        confirmadas=RegistroHoras.confirmadas_del_voluntario(session, current_user.user_id),
    )


@router.get(
    "/actividades/{activity_id}",
    response_model=HorasActividadRead,
    summary="Horas de una actividad (organizador: todas; voluntario: las suyas)",
)
def horas_de_actividad(
    activity_id: UUID, current_user: CurrentUser, session: DBSession
) -> HorasActividadRead:
    user_id = current_user.user_id
    activity = Activity.get_or_404(session, activity_id)
    es_organizador = activity.is_owner(user_id)
    if activity.is_draft and not es_organizador:
        raise ActivityNotFoundException()

    return render_horas_actividad(
        activity,
        es_organizador=es_organizador,
        puede_registrar=es_organizador and activity.has_passed() and not activity.is_cancelled,
        aceptados=(
            Participation.list_by_status(session, activity_id, EstadoParticipacion.ACEPTADA)
            if es_organizador
            else []
        ),
        registros=RegistroHoras.of_activity(
            session, activity_id, user_id=None if es_organizador else user_id
        ),
    )


@router.post(
    "/actividades/{activity_id}/jornadas",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar las horas de una jornada (solo organizador)",
)
def registrar_jornada(
    activity_id: UUID,
    payload: RegistrarJornadaRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    # FOR UPDATE: dos registros de la misma jornada no se cruzan
    activity = Activity.get_or_404(session, activity_id, for_update=True)
    horas = {r.user_id: r.horas for r in payload.registros}
    if len(horas) != len(payload.registros):
        raise ValidationException("Cada participante puede aparecer una sola vez por jornada.")

    session.add_all(
        RegistroHoras.registrar_jornada(
            session, activity, current_user.user_id, payload.jornada, horas
        )
    )
    session.commit()
    return Response(status_code=status.HTTP_201_CREATED)


@router.patch(
    "/{registro_id}",
    status_code=status.HTTP_200_OK,
    summary="Corregir las horas (solo organizador); vuelven a esperar aceptación",
)
def corregir_horas(
    registro_id: UUID,
    payload: CorregirHorasRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    registro = RegistroHoras.get_or_404(session, registro_id)
    activity = Activity.get_or_404(session, registro.activity_id)
    registro.corregir(activity, current_user.user_id, payload.horas)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{registro_id}/aceptar",
    status_code=status.HTTP_200_OK,
    summary="El voluntario acepta sus horas",
)
def aceptar_horas(registro_id: UUID, current_user: CurrentUser, session: DBSession) -> Response:
    RegistroHoras.get_or_404(session, registro_id).aceptar(current_user.user_id)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{registro_id}/reclamar",
    status_code=status.HTTP_200_OK,
    summary="El voluntario reclama sus horas con un motivo",
)
def reclamar_horas(
    registro_id: UUID,
    payload: ReclamarHorasRequest,
    current_user: CurrentUser,
    session: DBSession,
) -> Response:
    RegistroHoras.get_or_404(session, registro_id).reclamar(current_user.user_id, payload.motivo)
    session.commit()
    return Response(status_code=status.HTTP_200_OK)
