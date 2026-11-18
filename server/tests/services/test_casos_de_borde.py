"""
Casos de borde de los services: validaciones de entrada y defensas que los
flujos normales no alcanzan a tocar.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.dtos.horas_dto import HorasParticipanteRequest, RegistrarJornadaRequest
from app.entities import Activity, Participation
from app.entities.registro_horas import MAX_MOTIVO_RECLAMO, RegistroHoras
from app.exceptions import (
    ActivityNotFoundException,
    HorasInvalidasException,
    InvalidActivityDateException,
    InvalidActivityImageException,
    NoEstaEnListaDeEsperaException,
    SolicitudYaRevisadaException,
    ValidationException,
)
from app.repositories.cause_repository import CauseRepository
from app.services import activity_service
from app.services.activity_service import (
    ActivityService,
    _clean,
    missing_requirements,
    validate_date,
    validate_image_url,
    validate_owner_id,
)
from app.services.cause_service import CauseService
from app.services.cuenta_service import CuentaService
from app.services.horas_service import HorasService, validate_horas
from app.services.participation_service import ParticipationService
from tests.helpers import ORGANIZADOR, crear_actividad, crear_solicitud, crear_usuario


# ── Catálogo de causas (lo usa la semilla) ────────────────────────────────────
def test_crear_causa_limpia_el_nombre_y_el_slug(db_session):
    causa = CauseService(db_session).crear_si_no_existe("  Salud  ", " SALUD ")
    assert (causa.name, causa.slug) == ("Salud", "salud")


def test_crear_causa_que_ya_existe_no_la_duplica(db_session):
    service = CauseService(db_session)
    service.crear_si_no_existe("Salud", "salud")
    assert service.crear_si_no_existe("Salud", "salud") is None
    assert len(service.listar().items) == 1


@pytest.mark.parametrize("nombre, slug", [("  ", "salud"), ("Salud", " "), (None, "salud")])
def test_crear_causa_sin_nombre_o_sin_slug_falla(db_session, nombre, slug):
    with pytest.raises(ValueError):
        CauseService(db_session).crear_si_no_existe(nombre, slug)


def test_causas_de_ninguna_actividad_es_vacio(db_session):
    assert CauseRepository(db_session).find_by_activities([]) == {}


# ── Actividades ───────────────────────────────────────────────────────────────
def test_portada_que_no_se_puede_guardar_da_un_error_claro(monkeypatch):
    def disco_lleno(*args, **kwargs):
        raise OSError("disco lleno")

    monkeypatch.setattr(activity_service, "save_activity_image", disco_lleno)
    with pytest.raises(InvalidActivityImageException, match="No se pudo guardar"):
        ActivityService._guardar_portada(b"imagen", "foto.png")


def test_a_un_borrador_vacio_le_falta_todo_para_publicarse():
    vacia = Activity(
        name=" ",
        owner_id=ORGANIZADOR,
        image_url=" ",
        capacity=0,
        date=datetime.now(timezone.utc) - timedelta(days=1),
    )
    faltan = missing_requirements(vacia, None, [])
    assert faltan == [
        "título",
        "fecha futura válida",
        "foto de portada",
        "cupos disponibles",
        "ubicación en el mapa",
        "descripción",
        "al menos una causa temática",
    ]


def test_validaciones_de_los_datos_de_una_actividad():
    with pytest.raises(ValueError):
        validate_owner_id("   ")
    with pytest.raises(InvalidActivityImageException):
        validate_image_url("   ")
    with pytest.raises(InvalidActivityDateException):
        validate_date("2026-12-01")
    assert _clean(None, 10, "muy largo") is None


# ── Solicitudes ───────────────────────────────────────────────────────────────
def test_solo_entra_desde_la_lista_de_espera_quien_estaba_en_espera(db_session):
    service = ParticipationService(db_session)
    service.participations = SimpleNamespace(
        flush=lambda: None,
        count_accepted=lambda _: 0,
        find_waiting=lambda _: [Participation(status="pendiente")],
    )
    activity = Activity(id=uuid4(), capacity=2, status="active")
    with pytest.raises(NoEstaEnListaDeEsperaException):
        service.llenar_cupos_desde_lista_de_espera(activity)


def test_cancelar_una_actividad_no_toca_solicitudes_ya_revisadas(db_session):
    service = ParticipationService(db_session)
    service.participations = SimpleNamespace(
        find_applicants=lambda _: [Participation(status="rechazada")]
    )
    with pytest.raises(SolicitudYaRevisadaException):
        service.cancelar_solicitudes_de(Activity(id=uuid4(), status="active"))


# ── Horas ─────────────────────────────────────────────────────────────────────
def test_un_voluntario_no_ve_las_horas_de_un_borrador(db_session):
    borrador = crear_actividad(db_session, status="draft")
    with pytest.raises(ActivityNotFoundException):
        HorasService(db_session).horas_de_actividad(borrador.id, "voluntario")


def test_un_participante_no_puede_repetirse_en_la_misma_jornada(db_session):
    activity = crear_actividad(db_session)
    datos = RegistrarJornadaRequest(
        jornada=datetime.now().date(),
        registros=[
            HorasParticipanteRequest(user_id="ana", horas=2),
            HorasParticipanteRequest(user_id="ana", horas=3),
        ],
    )
    with pytest.raises(ValidationException, match="una sola vez"):
        HorasService(db_session).registrar_jornada(activity.id, ORGANIZADOR, datos)


def test_el_motivo_del_reclamo_tiene_un_limite(db_session, monkeypatch):
    service = HorasService(db_session)
    registro = RegistroHoras(estado="pendiente")
    monkeypatch.setattr(service, "_registro_pendiente_del_voluntario", lambda *_: registro)
    with pytest.raises(ValidationException, match=str(MAX_MOTIVO_RECLAMO)):
        service.reclamar(uuid4(), "voluntario", "x" * (MAX_MOTIVO_RECLAMO + 1))
    assert registro.estado == "pendiente"


@pytest.mark.parametrize("horas", [True, "3", None])
def test_las_horas_tienen_que_ser_un_numero(horas):
    with pytest.raises(HorasInvalidasException):
        validate_horas(horas)


# ── Eliminar la cuenta ────────────────────────────────────────────────────────
def test_al_eliminar_la_cuenta_no_se_tocan_solicitudes_cerradas(db_session):
    crear_usuario(db_session, "voluntario", "Voluntario")
    abierta = crear_actividad(db_session, name="Abierta")
    cancelada = crear_actividad(db_session, name="Cancelada", status="cancelled")
    rechazada = crear_solicitud(db_session, abierta, "voluntario", "rechazada")
    en_cancelada = crear_solicitud(db_session, cancelada, "voluntario", "pendiente")

    assert CuentaService(db_session)._retirar_solicitudes("voluntario") == (0, 0)
    assert rechazada.status == "rechazada"
    assert en_cancelada.status == "pendiente"
