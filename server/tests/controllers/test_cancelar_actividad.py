"""La organización cancela una actividad publicada con un motivo obligatorio."""

import pytest
from sqlmodel import select

from app.controllers import activity_controller, participation_controller
from app.models import Activity, Participation
from app.models.exceptions import ForbiddenException, MotivoCancelacionObligatorioException
from app.views.activity_view import CancelarActividadRequest, UpdateActivityCapacityRequest
from tests.helpers import ORGANIZADOR, crear_actividad, crear_solicitud, crear_usuario, estados, usuario

MOTIVO = "Se suspendió por lluvia"
ORG = usuario(ORGANIZADOR)


def cancelar(session, activity, user=ORG, motivo=MOTIVO):
    return activity_controller.cancelar_actividad(
        activity.id, CancelarActividadRequest(motivo=motivo), user, session
    )


@pytest.fixture
def actividad_con_postulantes(db_session):
    for user_id, name in [
        (ORGANIZADOR, "Ana Rojas"),
        ("luis", "Luis Mamani"),
        ("maria", "María López"),
        ("sofia", "Sofía Vargas"),
        ("carlos", "Carlos Quispe"),
    ]:
        crear_usuario(db_session, user_id, name)
    activity = crear_actividad(db_session, name="Taller de huertos urbanos", capacity=1)
    for user_id, estado in [
        ("luis", "aceptada"),
        ("maria", "pendiente"),
        ("sofia", "en_espera"),
        ("carlos", "rechazada"),
    ]:
        crear_solicitud(db_session, activity, user_id, estado)
    return activity


def test_la_base_guarda_el_motivo_y_el_estado_anterior_de_cada_solicitud(
    db_session, actividad_con_postulantes
):
    activity = actividad_con_postulantes
    cancelar(db_session, activity)

    db_session.expire_all()
    guardada = db_session.get(Activity, activity.id)
    assert (guardada.status, guardada.motivo_cancelacion) == ("cancelled", MOTIVO)
    filas = {
        p.user_id: (p.status, p.estado_anterior)
        for p in db_session.exec(select(Participation)).all()
    }
    assert filas == {
        "luis": ("cancelada", "aceptada"),
        "maria": ("cancelada", "pendiente"),
        "sofia": ("cancelada", "en_espera"),
        "carlos": ("rechazada", None),
    }


def test_la_organizadora_ve_a_quien_afecto(db_session, actividad_con_postulantes):
    activity = actividad_con_postulantes
    cancelar(db_session, activity)

    detalle = activity_controller.get_activity_detail(activity.id, ORG, db_session)
    assert (detalle.status, detalle.motivo_cancelacion) == ("cancelled", MOTIVO)
    assert {(p.name, p.estado_anterior) for p in detalle.postulantes_cancelados} == {
        ("Luis Mamani", "aceptada"),
        ("María López", "pendiente"),
        ("Sofía Vargas", "en_espera"),
    }

    # Un voluntario ve el motivo, pero no la lista de afectados
    de_maria = activity_controller.get_activity_detail(activity.id, usuario("maria"), db_session)
    assert de_maria.motivo_cancelacion == MOTIVO
    assert de_maria.estado_solicitud == "cancelada"
    assert de_maria.postulantes_cancelados == []


def test_cada_voluntario_ve_el_motivo_en_su_trayectoria(db_session, actividad_con_postulantes):
    cancelar(db_session, actividad_con_postulantes)
    items = participation_controller.list_my_participations(usuario("maria"), db_session).items
    assert [(i.estado_solicitud, i.estado_anterior, i.motivo_cancelacion) for i in items] == [
        ("cancelada", "pendiente", MOTIVO)
    ]


def test_solo_el_organizador_puede_cancelar(db_session, actividad_con_postulantes):
    activity = actividad_con_postulantes
    with pytest.raises(ForbiddenException):
        cancelar(db_session, activity, user=usuario("maria"))
    db_session.rollback()
    assert db_session.get(Activity, activity.id).status == "active"


def test_sin_motivo_no_se_cancela_nada(db_session, actividad_con_postulantes):
    activity = actividad_con_postulantes
    with pytest.raises(MotivoCancelacionObligatorioException):
        cancelar(db_session, activity, motivo="   ")
    db_session.rollback()
    assert estados(db_session, activity) == {
        "luis": "aceptada",
        "maria": "pendiente",
        "sofia": "en_espera",
        "carlos": "rechazada",
    }


def test_despues_de_cancelar_nadie_entra_desde_la_lista_de_espera(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    cancelar(db_session, activity)

    # Aunque se agreguen cupos, nadie de la lista de espera entra
    activity_controller.update_activity_capacity(
        activity.id, UpdateActivityCapacityRequest(capacity=5), ORG, db_session
    )
    assert estados(db_session, activity) == {"luis": "cancelada", "sofia": "cancelada"}
