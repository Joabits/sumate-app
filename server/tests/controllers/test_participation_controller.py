"""Endpoints de /participaciones: solicitar, cancelar, revisar y Mi trayectoria."""

from uuid import uuid4

import pytest
from sqlmodel import select

from app.services.participation_service import ParticipationService
from app.controllers import participation_controller as ctrl
from app.dtos.participation_dto import RetiroRequest
from app.entities import ActivityCause, Participation
from app.exceptions import (
    ActividadCanceladaException,
    ActivityCapacityExceededException,
    ActivityNotFoundException,
    CannotJoinOwnActivityException,
    CannotLeavePastActivityException,
    MotivoRetiroObligatorioException,
    NoEsOrganizadorException,
    ParticipationNotFoundException,
    RetiroFueraDePlazoException,
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


# ── Retirarme de una actividad ────────────────────────────────────────────────
def retirarse(activity_id, user, motivo=None, *, session):
    return ctrl.retirarse(
        activity_id, RetiroRequest(motivo=motivo), user, ParticipationService(session)
    )


def test_un_pendiente_se_retira_sin_motivo(db_session):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    retiro = retirarse(activity.id, MARIA, session=db_session)
    assert retiro.estado_anterior == "pendiente"
    assert retiro.entro_de_lista_de_espera is False
    assert estados(db_session, activity) == {"maria": "retirada"}


def test_un_aceptado_a_tiempo_se_retira_con_motivo_y_entra_el_primero_en_espera(db_session):
    activity = crear_actividad(db_session, capacity=1, date=en_dias(3))
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    crear_solicitud(db_session, activity, "carlos", "en_espera")

    retiro = retirarse(activity.id, usuario("luis"), "  Me surgió un viaje  ", session=db_session)

    assert retiro.estado_anterior == "aceptada"
    assert retiro.entro_de_lista_de_espera is True
    assert estados(db_session, activity) == {
        "luis": "retirada",
        "sofia": "aceptada",
        "carlos": "en_espera",
    }
    luis = db_session.exec(
        select(Participation).where(Participation.user_id == "luis")
    ).one()
    assert luis.motivo_retiro == "Me surgió un viaje"


def test_un_aceptado_no_se_retira_sin_motivo(db_session):
    activity = crear_actividad(db_session, date=en_dias(3))
    crear_solicitud(db_session, activity, "maria", "aceptada")
    for motivo in (None, "", "   ", "x" * 501):
        with pytest.raises(MotivoRetiroObligatorioException):
            retirarse(activity.id, MARIA, motivo, session=db_session)
        db_session.rollback()
    assert estados(db_session, activity) == {"maria": "aceptada"}


def test_un_aceptado_fuera_de_plazo_no_se_retira(db_session):
    # Faltan 23 horas: menos de las 24 del plazo
    activity = crear_actividad(db_session, capacity=1, date=en_dias(23 / 24))
    crear_solicitud(db_session, activity, "maria", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    with pytest.raises(RetiroFueraDePlazoException):
        retirarse(activity.id, MARIA, "Me enfermé", session=db_session)
    db_session.rollback()
    assert estados(db_session, activity) == {"maria": "aceptada", "sofia": "en_espera"}


def test_fuera_de_plazo_un_pendiente_todavia_retira_su_solicitud(db_session):
    activity = crear_actividad(db_session, date=en_dias(0.5))
    crear_solicitud(db_session, activity, "maria", "pendiente")
    retirarse(activity.id, MARIA, session=db_session)
    assert estados(db_session, activity) == {"maria": "retirada"}


def test_si_sale_alguien_de_la_lista_de_espera_no_entra_nadie(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    crear_solicitud(db_session, activity, "carlos", "en_espera")

    retiro = retirarse(activity.id, usuario("sofia"), session=db_session)

    assert retiro.entro_de_lista_de_espera is False
    assert estados(db_session, activity) == {
        "luis": "aceptada",
        "sofia": "retirada",
        "carlos": "en_espera",
    }


def test_un_rechazado_no_se_retira_para_reintentar(db_session):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "rechazada")
    with pytest.raises(ParticipationNotFoundException):
        retirarse(activity.id, MARIA, session=db_session)
    db_session.rollback()
    assert estados(db_session, activity) == {"maria": "rechazada"}


def test_no_se_retira_sin_solicitud_ni_en_una_actividad_pasada(db_session):
    activity = crear_actividad(db_session)
    with pytest.raises(ParticipationNotFoundException):
        retirarse(activity.id, MARIA, session=db_session)
    with pytest.raises(ActivityNotFoundException):
        retirarse(uuid4(), MARIA, session=db_session)

    pasada = crear_actividad(db_session, date=en_dias(-1))
    crear_solicitud(db_session, pasada, "maria", "aceptada")
    with pytest.raises(CannotLeavePastActivityException):
        retirarse(pasada.id, MARIA, "Motivo", session=db_session)


def test_quien_se_retiro_puede_volver_a_postular(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    retirarse(activity.id, MARIA, session=db_session)

    ctrl.join_activity(activity.id, MARIA, ParticipationService(db_session))

    assert estados(db_session, activity) == {"maria": "pendiente"}


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
        retirarse(activity.id, usuario("luis"), "Motivo", session=db_session)
    db_session.rollback()
    assert estados(db_session, activity) == {"luis": "cancelada"}
