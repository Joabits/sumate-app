"""Endpoints de /participaciones: solicitar, cancelar, revisar y Mi trayectoria."""

from uuid import uuid4

import pytest

from app.services.participation_service import ParticipationService
from app.controllers import participation_controller as ctrl
from app.entities import ActivityCause
from app.exceptions import (
    ActividadCanceladaException,
    ActivityCapacityExceededException,
    ActivityNotFoundException,
    CannotJoinOwnActivityException,
    CannotLeavePastActivityException,
    NoEsOrganizadorException,
    ParticipationNotFoundException,
    SolicitudRechazadaException,
    SolicitudYaRevisadaException,
)
from tests.helpers import (
    ORGANIZADOR,
    crear_actividad,
    crear_causa,
    crear_solicitud,
    crear_usuario,
    en_dias,
    estados,
    usuario,
)

ORG = usuario(ORGANIZADOR)
MARIA = usuario("maria")


# ── Solicitar ─────────────────────────────────────────────────────────────────
def test_solicitar_crea_una_solicitud_pendiente(db_session):
    activity = crear_actividad(db_session, capacity=2)
    response = ctrl.join_activity(activity.id, MARIA, ParticipationService(db_session))
    assert response.status_code == 201
    assert estados(db_session, activity) == {"maria": "pendiente"}


def test_con_cupos_llenos_entra_a_la_lista_de_espera(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    ctrl.join_activity(activity.id, MARIA, ParticipationService(db_session))
    assert estados(db_session, activity)["maria"] == "en_espera"


def test_errores_al_solicitar(db_session):
    activity = crear_actividad(db_session)
    with pytest.raises(ActivityNotFoundException):
        ctrl.join_activity(uuid4(), MARIA, ParticipationService(db_session))
    with pytest.raises(CannotJoinOwnActivityException):
        ctrl.join_activity(activity.id, ORG, ParticipationService(db_session))
    crear_solicitud(db_session, activity, "maria", "rechazada")
    with pytest.raises(SolicitudRechazadaException):
        ctrl.join_activity(activity.id, MARIA, ParticipationService(db_session))


# ── Cancelar mi solicitud ─────────────────────────────────────────────────────
def test_una_solicitud_pendiente_se_puede_cancelar(db_session):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    ctrl.leave_activity(activity.id, MARIA, ParticipationService(db_session))
    assert estados(db_session, activity) == {}


def test_un_rechazado_no_borra_su_solicitud_para_reintentar(db_session):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "rechazada")
    with pytest.raises(ParticipationNotFoundException):
        ctrl.leave_activity(activity.id, MARIA, ParticipationService(db_session))
    db_session.rollback()
    assert estados(db_session, activity) == {"maria": "rechazada"}


def test_no_se_cancela_sin_solicitud_ni_en_una_actividad_pasada(db_session):
    activity = crear_actividad(db_session)
    with pytest.raises(ParticipationNotFoundException):
        ctrl.leave_activity(activity.id, MARIA, ParticipationService(db_session))
    with pytest.raises(ActivityNotFoundException):
        ctrl.leave_activity(uuid4(), MARIA, ParticipationService(db_session))

    pasada = crear_actividad(db_session, date=en_dias(-1))
    crear_solicitud(db_session, pasada, "maria", "aceptada")
    with pytest.raises(CannotLeavePastActivityException):
        ctrl.leave_activity(pasada.id, MARIA, ParticipationService(db_session))


def test_si_cancela_un_aceptado_entra_el_primero_en_espera(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    crear_solicitud(db_session, activity, "carlos", "en_espera")

    ctrl.leave_activity(activity.id, usuario("luis"), ParticipationService(db_session))

    assert estados(db_session, activity) == {"sofia": "aceptada", "carlos": "en_espera"}


def test_si_sale_alguien_de_la_lista_de_espera_no_entra_nadie(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    crear_solicitud(db_session, activity, "carlos", "en_espera")

    ctrl.leave_activity(activity.id, usuario("sofia"), ParticipationService(db_session))

    assert estados(db_session, activity) == {"luis": "aceptada", "carlos": "en_espera"}


# ── Revisar solicitudes (organizador) ─────────────────────────────────────────
def test_el_organizador_acepta_y_rechaza(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    crear_solicitud(db_session, activity, "carlos", "pendiente")

    ctrl.aceptar_solicitud(activity.id, "maria", ORG, ParticipationService(db_session))
    ctrl.rechazar_solicitud(activity.id, "carlos", ORG, ParticipationService(db_session))

    assert estados(db_session, activity) == {"maria": "aceptada", "carlos": "rechazada"}


def test_aceptar_falla_si_no_quedan_cupos(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "maria", "pendiente")
    with pytest.raises(ActivityCapacityExceededException):
        ctrl.aceptar_solicitud(activity.id, "maria", ORG, ParticipationService(db_session))


@pytest.mark.parametrize("revisar", [ctrl.aceptar_solicitud, ctrl.rechazar_solicitud])
def test_errores_al_revisar(db_session, revisar):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    crear_solicitud(db_session, activity, "luis", "aceptada")

    with pytest.raises(NoEsOrganizadorException):
        revisar(activity.id, "maria", MARIA, ParticipationService(db_session))
    with pytest.raises(ParticipationNotFoundException):
        revisar(activity.id, "nadie", ORG, ParticipationService(db_session))
    with pytest.raises(ActivityNotFoundException):
        revisar(uuid4(), "maria", ORG, ParticipationService(db_session))
    with pytest.raises(SolicitudYaRevisadaException):
        revisar(activity.id, "luis", ORG, ParticipationService(db_session))


# ── Mi trayectoria ────────────────────────────────────────────────────────────
def test_mi_trayectoria_primero_las_proximas_y_luego_las_pasadas(db_session):
    crear_usuario(db_session, ORGANIZADOR, "Ana Rojas")
    lejana = crear_actividad(db_session, name="Lejana", date=en_dias(10))
    cercana = crear_actividad(db_session, name="Cercana", date=en_dias(1))
    pasada = crear_actividad(db_session, name="Pasada", date=en_dias(-2))
    muy_pasada = crear_actividad(db_session, name="Muy pasada", date=en_dias(-20))
    propia = crear_actividad(db_session, name="Propia", owner_id="maria")
    salud = crear_causa(db_session, "Salud")
    db_session.add(ActivityCause(activity_id=cercana.id, cause_id=salud.id))
    for activity in (lejana, cercana, pasada, muy_pasada, propia):
        crear_solicitud(db_session, activity, "maria", "aceptada")

    items = ctrl.list_my_participations(MARIA, ParticipationService(db_session)).items

    assert [i.name for i in items] == ["Cercana", "Lejana", "Pasada", "Muy pasada"]
    assert [i.is_past for i in items] == [False, False, True, True]
    assert items[0].creator_name == "Ana Rojas"
    assert [c.name for c in items[0].causes] == ["Salud"]
    assert items[0].date.tzinfo is not None


# ── Después de que la organización cancela ────────────────────────────────────
def test_despues_de_cancelar_no_se_solicita_ni_se_revisa_ni_se_sale(db_session):
    activity = crear_actividad(db_session, status="cancelled")
    crear_solicitud(db_session, activity, "luis", "cancelada")

    with pytest.raises(ActividadCanceladaException):
        ctrl.join_activity(activity.id, MARIA, ParticipationService(db_session))
    with pytest.raises(ActividadCanceladaException):
        ctrl.aceptar_solicitud(activity.id, "luis", ORG, ParticipationService(db_session))
    with pytest.raises(ActividadCanceladaException):
        ctrl.rechazar_solicitud(activity.id, "luis", ORG, ParticipationService(db_session))
    # La solicitud no se borra: queda en el historial
    with pytest.raises(ActividadCanceladaException):
        ctrl.leave_activity(activity.id, usuario("luis"), ParticipationService(db_session))
    db_session.rollback()
    assert estados(db_session, activity) == {"luis": "cancelada"}
