"""Reglas de ParticipationService: estados de la solicitud y lista de espera."""

import pytest

from app.dtos.activity_dto import CancelarActividadRequest
from app.entities import EstadoParticipacion, User
from app.exceptions import (
    ActividadCanceladaException,
    ActivityCapacityExceededException,
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
    SolicitudRechazadaException,
    SolicitudYaRevisadaException,
)
from app.services.activity_service import ActivityService
from app.services.participation_service import ParticipationService
from tests.helpers import ORGANIZADOR, crear_actividad, crear_solicitud, en_dias, estados


@pytest.fixture
def service(db_session) -> ParticipationService:
    return ParticipationService(db_session)


# ── Aceptar y rechazar ────────────────────────────────────────────────────────
def test_aceptar_y_rechazar_una_pendiente(db_session, service):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    crear_solicitud(db_session, activity, "carlos", "pendiente")

    service.aceptar_solicitud(activity.id, "maria", ORGANIZADOR)
    service.rechazar_solicitud(activity.id, "carlos", ORGANIZADOR)

    assert estados(db_session, activity) == {"maria": "aceptada", "carlos": "rechazada"}


@pytest.mark.parametrize("estado", ["aceptada", "rechazada", "en_espera"])
def test_una_solicitud_revisada_no_se_revisa_otra_vez(db_session, service, estado):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", estado)
    with pytest.raises(SolicitudYaRevisadaException):
        service.aceptar_solicitud(activity.id, "maria", ORGANIZADOR)
    with pytest.raises(SolicitudYaRevisadaException):
        service.rechazar_solicitud(activity.id, "maria", ORGANIZADOR)
    assert estados(db_session, activity) == {"maria": estado}


def test_aceptar_falla_sin_cupos_o_si_ya_paso(db_session, service):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "maria", "pendiente")
    with pytest.raises(ActivityCapacityExceededException):
        service.aceptar_solicitud(activity.id, "maria", ORGANIZADOR)

    pasada = crear_actividad(db_session, date=en_dias(-1))
    crear_solicitud(db_session, pasada, "sofia", "pendiente")
    with pytest.raises(CannotJoinPastActivityException):
        service.aceptar_solicitud(pasada.id, "sofia", ORGANIZADOR)


# ── Cancelación por la organización ───────────────────────────────────────────
def test_las_solicitudes_canceladas_guardan_su_estado_anterior(db_session):
    activity = crear_actividad(db_session, capacity=1)
    for user_id, estado in [
        ("maria", "pendiente"),
        ("luis", "aceptada"),
        ("sofia", "en_espera"),
        ("carlos", "rechazada"),
    ]:
        crear_solicitud(db_session, activity, user_id, estado)

    ActivityService(db_session).cancelar(
        activity.id, ORGANIZADOR, CancelarActividadRequest(motivo="Lluvia")
    )

    db_session.expire_all()
    filas = {
        p.user_id: (p.status, p.estado_anterior)
        for p in ParticipationService(db_session).participations.find_by_status(
            activity.id, EstadoParticipacion.CANCELADA
        )
    }
    assert filas == {
        "maria": ("cancelada", "pendiente"),
        "luis": ("cancelada", "aceptada"),
        "sofia": ("cancelada", "en_espera"),
    }
    # La rechazada no cambia
    assert estados(db_session, activity)["carlos"] == "rechazada"


# ── Solicitar ─────────────────────────────────────────────────────────────────
def test_con_cupos_libres_la_solicitud_queda_pendiente(db_session, service):
    activity = crear_actividad(db_session, capacity=2)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    nueva = service.solicitar(activity.id, "maria")
    assert nueva.estado == EstadoParticipacion.PENDIENTE


def test_con_cupos_llenos_la_solicitud_queda_en_espera(db_session, service):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    # Las pendientes no ocupan cupo; solo las aceptadas
    crear_solicitud(db_session, activity, "ana", "pendiente")
    nueva = service.solicitar(activity.id, "maria")
    assert nueva.estado == EstadoParticipacion.EN_ESPERA


def test_el_organizador_no_solicita_en_su_actividad(db_session, service):
    activity = crear_actividad(db_session)
    with pytest.raises(CannotJoinOwnActivityException):
        service.solicitar(activity.id, ORGANIZADOR)


@pytest.mark.parametrize("status", ["draft", "closed"])
def test_no_se_solicita_en_una_actividad_no_activa(db_session, service, status):
    activity = crear_actividad(db_session, status=status)
    with pytest.raises(CannotJoinInactiveActivityException):
        service.solicitar(activity.id, "maria")


def test_no_se_solicita_en_una_actividad_cancelada(db_session, service):
    activity = crear_actividad(db_session, status="cancelled")
    with pytest.raises(ActividadCanceladaException):
        service.solicitar(activity.id, "maria")


def test_no_se_solicita_en_una_actividad_pasada(db_session, service):
    activity = crear_actividad(db_session, date=en_dias(-1))
    with pytest.raises(CannotJoinPastActivityException):
        service.solicitar(activity.id, "maria")


def test_no_se_solicita_dos_veces(db_session, service):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    with pytest.raises(AlreadyParticipatingException):
        service.solicitar(activity.id, "maria")


def test_un_rechazado_no_vuelve_a_solicitar(db_session, service):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "rechazada")
    with pytest.raises(SolicitudRechazadaException):
        service.solicitar(activity.id, "maria")


# ── Lista de espera ───────────────────────────────────────────────────────────
def test_entran_los_primeros_en_espera_en_orden_de_llegada(db_session, service):
    activity = crear_actividad(db_session, capacity=3)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    for user_id in ("sofia", "carlos", "pedro"):
        crear_solicitud(db_session, activity, user_id, "en_espera")

    entran = service.llenar_cupos_desde_lista_de_espera(activity)
    db_session.commit()

    assert [p.user_id for p in entran] == ["sofia", "carlos"]
    assert estados(db_session, activity) == {
        "luis": "aceptada",
        "sofia": "aceptada",
        "carlos": "aceptada",
        "pedro": "en_espera",
    }


def test_cuando_sale_un_aceptado_entra_el_primero_en_espera(db_session, service):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")

    service.salir(activity.id, "luis")

    assert estados(db_session, activity) == {"sofia": "aceptada"}


def test_sin_cupos_libres_no_entra_nadie(db_session, service):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    assert service.llenar_cupos_desde_lista_de_espera(activity) == []


def test_una_actividad_cancelada_no_llena_cupos(db_session, service):
    activity = crear_actividad(db_session, capacity=5, status="cancelled")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    assert service.llenar_cupos_desde_lista_de_espera(activity) == []


def test_el_usuario_solo_mapea_columnas_base_de_better_auth():
    # role, banned... vienen de plugins que no están instalados: pedirlos rompe la consulta
    columnas_base = {"id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"}
    assert set(User.__table__.columns.keys()) <= columnas_base
