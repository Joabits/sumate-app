"""Reglas del modelo Participation: estados de la solicitud y lista de espera."""

import pytest

from app.models import EstadoParticipacion, Participation
from app.models.exceptions import (
    ActividadCanceladaException,
    ActivityCapacityExceededException,
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
    NoEstaEnListaDeEsperaException,
    SolicitudRechazadaException,
    SolicitudYaRevisadaException,
)
from tests.helpers import ORGANIZADOR, crear_actividad, crear_solicitud, en_dias, estados


# ── Transiciones de estado ────────────────────────────────────────────────────
def test_aceptar_y_rechazar_una_pendiente():
    pendiente = Participation(user_id="u", status="pendiente")
    pendiente.aceptar()
    assert pendiente.estado == EstadoParticipacion.ACEPTADA

    otra = Participation(user_id="u", status="pendiente")
    otra.rechazar()
    assert otra.estado == EstadoParticipacion.RECHAZADA


@pytest.mark.parametrize("estado", ["aceptada", "rechazada", "en_espera", "cancelada"])
def test_una_solicitud_revisada_no_se_revisa_otra_vez(estado):
    participation = Participation(user_id="u", status=estado)
    with pytest.raises(SolicitudYaRevisadaException):
        participation.aceptar()
    with pytest.raises(SolicitudYaRevisadaException):
        participation.rechazar()
    assert participation.status == estado


def test_la_solicitud_en_espera_ocupa_el_cupo_liberado():
    participation = Participation(user_id="u", status="en_espera")
    participation.ocupar_cupo_liberado()
    assert participation.estado == EstadoParticipacion.ACEPTADA


@pytest.mark.parametrize("estado", ["pendiente", "aceptada", "rechazada", "cancelada"])
def test_solo_una_solicitud_en_espera_ocupa_un_cupo_liberado(estado):
    with pytest.raises(NoEstaEnListaDeEsperaException):
        Participation(user_id="u", status=estado).ocupar_cupo_liberado()


@pytest.mark.parametrize("estado", ["pendiente", "aceptada", "en_espera"])
def test_la_solicitud_cancelada_guarda_su_estado_anterior(estado):
    participation = Participation(user_id="u", status=estado)
    participation.cancelar_por_organizacion()
    assert participation.status == "cancelada"
    assert participation.estado_anterior == estado


def test_una_solicitud_rechazada_no_se_cancela():
    participation = Participation(user_id="u", status="rechazada")
    with pytest.raises(SolicitudYaRevisadaException):
        participation.cancelar_por_organizacion()
    assert participation.estado_anterior is None


# ── Solicitar (con base de datos) ─────────────────────────────────────────────
def test_con_cupos_libres_la_solicitud_queda_pendiente(db_session):
    activity = crear_actividad(db_session, capacity=2)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    nueva = Participation.solicitar(db_session, activity, "maria")
    assert nueva.estado == EstadoParticipacion.PENDIENTE


def test_con_cupos_llenos_la_solicitud_queda_en_espera(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    # Las pendientes no ocupan cupo; solo las aceptadas
    crear_solicitud(db_session, activity, "ana", "pendiente")
    nueva = Participation.solicitar(db_session, activity, "maria")
    assert nueva.estado == EstadoParticipacion.EN_ESPERA


def test_el_organizador_no_solicita_en_su_actividad(db_session):
    activity = crear_actividad(db_session)
    with pytest.raises(CannotJoinOwnActivityException):
        Participation.solicitar(db_session, activity, ORGANIZADOR)


@pytest.mark.parametrize("status", ["draft", "closed"])
def test_no_se_solicita_en_una_actividad_no_activa(db_session, status):
    activity = crear_actividad(db_session, status=status)
    with pytest.raises(CannotJoinInactiveActivityException):
        Participation.solicitar(db_session, activity, "maria")


def test_no_se_solicita_en_una_actividad_cancelada(db_session):
    activity = crear_actividad(db_session, status="cancelled")
    with pytest.raises(ActividadCanceladaException):
        Participation.solicitar(db_session, activity, "maria")


def test_no_se_solicita_en_una_actividad_pasada(db_session):
    activity = crear_actividad(db_session, date=en_dias(-1))
    with pytest.raises(CannotJoinPastActivityException):
        Participation.solicitar(db_session, activity, "maria")


def test_no_se_solicita_dos_veces(db_session):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    with pytest.raises(AlreadyParticipatingException):
        Participation.solicitar(db_session, activity, "maria")


def test_un_rechazado_no_vuelve_a_solicitar(db_session):
    activity = crear_actividad(db_session)
    crear_solicitud(db_session, activity, "maria", "rechazada")
    with pytest.raises(SolicitudRechazadaException):
        Participation.solicitar(db_session, activity, "maria")


def test_aceptar_falla_sin_cupos_o_si_ya_paso(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    maria = crear_solicitud(db_session, activity, "maria", "pendiente")
    with pytest.raises(ActivityCapacityExceededException):
        maria.aceptar_en(db_session, activity)

    pasada = crear_actividad(db_session, date=en_dias(-1))
    sofia = crear_solicitud(db_session, pasada, "sofia", "pendiente")
    with pytest.raises(CannotJoinPastActivityException):
        sofia.aceptar_en(db_session, pasada)


# ── Lista de espera ───────────────────────────────────────────────────────────
def test_entran_los_primeros_en_espera_en_orden_de_llegada(db_session):
    activity = crear_actividad(db_session, capacity=3)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    for user_id in ("sofia", "carlos", "pedro"):
        crear_solicitud(db_session, activity, user_id, "en_espera")

    entran = Participation.llenar_cupos_desde_lista_de_espera(db_session, activity)
    db_session.commit()

    assert [p.user_id for p in entran] == ["sofia", "carlos"]
    assert estados(db_session, activity) == {
        "luis": "aceptada",
        "sofia": "aceptada",
        "carlos": "aceptada",
        "pedro": "en_espera",
    }


def test_sin_cupos_libres_no_entra_nadie(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    assert Participation.llenar_cupos_desde_lista_de_espera(db_session, activity) == []


def test_una_actividad_cancelada_no_llena_cupos(db_session):
    activity = crear_actividad(db_session, capacity=5, status="cancelled")
    crear_solicitud(db_session, activity, "sofia", "en_espera")
    assert Participation.llenar_cupos_desde_lista_de_espera(db_session, activity) == []


def test_el_usuario_solo_mapea_columnas_base_de_better_auth():
    # role, banned... vienen de plugins que no están instalados: pedirlos rompe la consulta
    from app.models import User

    columnas_base = {"id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"}
    assert set(User.__table__.columns.keys()) <= columnas_base
