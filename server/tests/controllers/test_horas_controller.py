"""Horas de voluntariado: dos jornadas, reclamo, corrección, confirmación y constancia."""

from datetime import date, timedelta
from uuid import uuid4

import pytest

from app.services.horas_service import HorasService
from app.controllers import horas_controller as ctrl
from app.exceptions import (
    ActividadNoTerminadaException,
    FechaJornadaInvalidaException,
    ForbiddenException,
    HorasInvalidasException,
    HorasYaConfirmadasException,
    JornadaYaRegistradaException,
    MotivoReclamoObligatorioException,
    NoEsParticipanteAceptadoException,
    RegistroHorasNoPendienteException,
    RegistroHorasNotFoundException,
    ValidationException,
)
from app.core.fechas import dia_en_bolivia, hoy_en_bolivia
from app.dtos.horas_dto import (
    CorregirHorasRequest,
    HorasParticipanteRequest,
    ReclamarHorasRequest,
    RegistrarJornadaRequest,
)
from tests.helpers import ORGANIZADOR, crear_actividad, crear_solicitud, crear_usuario, en_dias, usuario

ORG = usuario(ORGANIZADOR)
LUIS = usuario("luis")
SOFIA = usuario("sofia")


@pytest.fixture
def terminada(db_session):
    """Actividad que terminó hace 3 días, con Luis y Sofía aceptados y María pendiente."""
    crear_usuario(db_session, ORGANIZADOR, "Ana Rojas")
    crear_usuario(db_session, "luis", "Luis Mamani")
    crear_usuario(db_session, "sofia", "Sofía Vargas")
    activity = crear_actividad(db_session, name="Reforestación en el Tunari", date=en_dias(-3))
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "sofia", "aceptada")
    crear_solicitud(db_session, activity, "maria", "pendiente")
    return activity


def dia_de(activity, extra: int = 0) -> date:
    return dia_en_bolivia(activity.date) + timedelta(days=extra)


def registrar(session, activity, jornada: date, user=ORG, **horas):
    payload = RegistrarJornadaRequest(
        jornada=jornada,
        registros=[HorasParticipanteRequest(user_id=u, horas=h) for u, h in horas.items()],
    )
    return ctrl.registrar_jornada(activity.id, payload, user, HorasService(session))


def horas(session, activity, user):
    session.expire_all()
    return ctrl.horas_de_actividad(activity.id, user, HorasService(session))


def registro_de(session, activity, user, numero_jornada: int):
    return horas(session, activity, user).registros[numero_jornada]


def test_dos_jornadas_reclamo_correccion_y_confirmacion(db_session, terminada):
    registrar(db_session, terminada, dia_de(terminada), luis=4, sofia=4)
    registrar(db_session, terminada, dia_de(terminada, 1), luis=3)

    # Luis ve sus dos jornadas pendientes; todavía no suma nada
    vista = horas(db_session, terminada, LUIS)
    assert [(r.jornada, r.horas, r.estado) for r in vista.registros] == [
        (dia_de(terminada), 4, "pendiente"),
        (dia_de(terminada, 1), 3, "pendiente"),
    ]
    assert vista.total_confirmado == 0

    # Acepta la primera y reclama la segunda
    primera, segunda = vista.registros
    ctrl.aceptar_horas(primera.id, LUIS, HorasService(db_session))
    ctrl.reclamar_horas(segunda.id, ReclamarHorasRequest(motivo="Me quedé hasta las 18:00, fueron 5 h"), LUIS, HorasService(db_session))

    vista = horas(db_session, terminada, LUIS)
    assert [r.estado for r in vista.registros] == ["confirmada", "reclamada"]
    assert vista.total_confirmado == 4

    # La organizadora ve el reclamo y corrige: vuelve a pendiente, con las horas anteriores
    reclamado = next(r for r in horas(db_session, terminada, ORG).registros if r.estado == "reclamada")
    assert reclamado.motivo_reclamo == "Me quedé hasta las 18:00, fueron 5 h"
    ctrl.corregir_horas(reclamado.id, CorregirHorasRequest(horas=5), ORG, HorasService(db_session))

    corregido = registro_de(db_session, terminada, LUIS, 1)
    assert (corregido.horas, corregido.horas_anteriores, corregido.estado) == (5, 3, "pendiente")
    # La corrección no suma hasta que Luis la acepte
    assert horas(db_session, terminada, LUIS).total_confirmado == 4
    assert ctrl.constancia(LUIS, HorasService(db_session)).total_horas == 4

    ctrl.aceptar_horas(corregido.id, LUIS, HorasService(db_session))
    assert horas(db_session, terminada, LUIS).total_confirmado == 9

    constancia = ctrl.constancia(LUIS, HorasService(db_session))
    assert constancia.voluntario == "Luis Mamani"
    assert constancia.total_horas == 9
    assert [(a.nombre, a.organizador, a.total_horas) for a in constancia.actividades] == [
        ("Reforestación en el Tunari", "Ana Rojas", 9)
    ]
    assert [j.horas for j in constancia.actividades[0].jornadas] == [4, 5]

    # Sofía no respondió: su constancia está vacía aunque tenga horas pendientes
    assert ctrl.constancia(SOFIA, HorasService(db_session)).total_horas == 0
    assert ctrl.constancia(SOFIA, HorasService(db_session)).actividades == []


def test_cada_uno_ve_lo_suyo(db_session, terminada):
    registrar(db_session, terminada, dia_de(terminada), luis=4, sofia=2)

    de_org = horas(db_session, terminada, ORG)
    assert de_org.es_organizador and de_org.puede_registrar
    assert {p.id for p in de_org.participantes_aceptados} == {"luis", "sofia"}
    assert {r.user_name for r in de_org.registros} == {"Luis Mamani", "Sofía Vargas"}

    de_luis = horas(db_session, terminada, LUIS)
    assert not de_luis.es_organizador and not de_luis.puede_registrar
    assert de_luis.participantes_aceptados == []
    assert [r.user_id for r in de_luis.registros] == ["luis"]


def test_solo_actividades_terminadas_y_del_organizador(db_session):
    futura = crear_actividad(db_session, date=en_dias(3))
    crear_solicitud(db_session, futura, "luis", "aceptada")
    with pytest.raises(ActividadNoTerminadaException):
        registrar(db_session, futura, hoy_en_bolivia(), luis=4)
    assert not horas(db_session, futura, ORG).puede_registrar

    pasada = crear_actividad(db_session, date=en_dias(-2))
    crear_solicitud(db_session, pasada, "luis", "aceptada")
    with pytest.raises(ForbiddenException):
        registrar(db_session, pasada, dia_de(pasada), user=LUIS, luis=4)


def test_validaciones_al_registrar(db_session, terminada):
    with pytest.raises(FechaJornadaInvalidaException):
        registrar(db_session, terminada, dia_de(terminada, -1), luis=4)
    with pytest.raises(FechaJornadaInvalidaException):
        registrar(db_session, terminada, hoy_en_bolivia() + timedelta(days=1), luis=4)
    for invalidas in (0, -1, 24.5):
        with pytest.raises(HorasInvalidasException):
            registrar(db_session, terminada, dia_de(terminada), luis=invalidas)
    # María solo tiene la solicitud pendiente: no participó
    with pytest.raises(NoEsParticipanteAceptadoException):
        registrar(db_session, terminada, dia_de(terminada), maria=4)
    with pytest.raises(ValidationException, match="al menos un participante"):
        registrar(db_session, terminada, dia_de(terminada))

    registrar(db_session, terminada, dia_de(terminada), luis=4)
    with pytest.raises(JornadaYaRegistradaException):
        registrar(db_session, terminada, dia_de(terminada), luis=2)


def test_reglas_al_responder_y_corregir(db_session, terminada):
    registrar(db_session, terminada, dia_de(terminada), luis=4)
    registro = registro_de(db_session, terminada, LUIS, 0)

    # Solo el voluntario responde sus horas, y el reclamo necesita motivo
    with pytest.raises(ForbiddenException):
        ctrl.aceptar_horas(registro.id, SOFIA, HorasService(db_session))
    with pytest.raises(MotivoReclamoObligatorioException):
        ctrl.reclamar_horas(registro.id, ReclamarHorasRequest(motivo="   "), LUIS, HorasService(db_session))
    # Solo el organizador corrige
    with pytest.raises(ForbiddenException):
        ctrl.corregir_horas(registro.id, CorregirHorasRequest(horas=5), LUIS, HorasService(db_session))

    ctrl.aceptar_horas(registro.id, LUIS, HorasService(db_session))
    # Lo confirmado ya no se responde ni se corrige
    with pytest.raises(RegistroHorasNoPendienteException):
        ctrl.aceptar_horas(registro.id, LUIS, HorasService(db_session))
    with pytest.raises(RegistroHorasNoPendienteException):
        ctrl.reclamar_horas(registro.id, ReclamarHorasRequest(motivo="x"), LUIS, HorasService(db_session))
    with pytest.raises(HorasYaConfirmadasException):
        ctrl.corregir_horas(registro.id, CorregirHorasRequest(horas=5), ORG, HorasService(db_session))

    with pytest.raises(RegistroHorasNotFoundException):
        ctrl.aceptar_horas(uuid4(), LUIS, HorasService(db_session))
