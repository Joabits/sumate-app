"""Reglas de ActivityService: crear, editar, publicar, cerrar, reabrir, cancelar y eliminar."""

from datetime import datetime, timedelta, timezone

import pytest

from app.dtos.activity_dto import (
    CancelarActividadRequest,
    CreateActivityRequest,
    UpdateActivityCapacityRequest,
    UpdateActivityInfoRequest,
)
from app.entities import Activity, ActivityDetail, ActivityStatus
from app.exceptions import (
    ActividadCanceladaException,
    CapacityLessThanRegisteredException,
    ForbiddenException,
    InvalidActivityCapacityException,
    InvalidActivityDateException,
    InvalidActivityDetailException,
    InvalidActivityNameException,
    MotivoCancelacionObligatorioException,
    ValidationException,
)
from app.services.activity_guards import ensure_owner
from app.services.activity_service import (
    ActivityService,
    ensure_future_date,
    validate_coordinates,
    validate_description,
    validate_place,
)
from tests.helpers import (
    ORGANIZADOR,
    completar_para_publicar,
    crear_actividad,
    crear_solicitud,
    en_dias,
    recargar,
)

MOTIVO = "Se suspendió por lluvia"


@pytest.fixture
def service(db_session, uploads_dir) -> ActivityService:
    return ActivityService(db_session)


def crear(service: ActivityService, **kwargs) -> Activity:
    datos = {"name": "Reforestación San Pedro", "date": en_dias(2), "capacity": 15}
    datos.update(kwargs)
    return service.crear("usr_123", CreateActivityRequest(**datos), b"imagen", "foto.png")


def cancelar(service: ActivityService, activity: Activity, motivo: str | None = MOTIVO) -> None:
    # model_construct deja pasar None para probar la regla del service
    service.cancelar(activity.id, ORGANIZADOR, CancelarActividadRequest.model_construct(motivo=motivo))


# ── Crear ─────────────────────────────────────────────────────────────────────
def test_una_actividad_nueva_es_borrador(service):
    activity = crear(service, name="  Reforestación San Pedro  ")
    assert activity.status == ActivityStatus.DRAFT
    assert activity.capacity == 15
    assert activity.name == "Reforestación San Pedro"


@pytest.mark.parametrize("capacity", [0, -5])
def test_los_cupos_deben_ser_mayores_a_cero(service, capacity):
    with pytest.raises(ValueError, match="mayor a cero"):
        crear(service, capacity=capacity)


def test_los_cupos_no_superan_diez_mil(service):
    with pytest.raises(InvalidActivityCapacityException) as exc_info:
        crear(service, capacity=10001)
    assert isinstance(exc_info.value, ValidationException)
    assert isinstance(exc_info.value, ValueError)


def test_el_nombre_es_obligatorio(service):
    with pytest.raises(InvalidActivityNameException):
        crear(service, name="   ")


def test_no_se_crea_con_fecha_pasada(service):
    with pytest.raises(InvalidActivityDateException, match="posterior"):
        crear(service, date=datetime.now(timezone.utc) - timedelta(hours=1))


def test_si_la_actividad_no_se_guarda_se_borra_la_imagen(service, uploads_dir):
    with pytest.raises(InvalidActivityNameException):
        crear(service, name="   ")
    assert list(uploads_dir.iterdir()) == []


def test_una_fecha_sin_zona_horaria_se_toma_como_utc():
    futura = (datetime.now(timezone.utc) + timedelta(hours=2)).replace(tzinfo=None)
    pasada = (datetime.now(timezone.utc) - timedelta(hours=2)).replace(tzinfo=None)
    ensure_future_date(futura)
    with pytest.raises(InvalidActivityDateException):
        ensure_future_date(pasada)


# ── Editar ────────────────────────────────────────────────────────────────────
def test_reprogramar_a_una_fecha_pasada_falla(db_session, service):
    activity = crear_actividad(db_session)
    with pytest.raises(InvalidActivityDateException):
        service.actualizar_datos(activity.id, ORGANIZADOR, UpdateActivityInfoRequest(date=en_dias(-1)))


def test_cambiar_solo_el_titulo_conserva_la_fecha(db_session, service):
    activity = crear_actividad(db_session)
    fecha = activity.date
    service.actualizar_datos(activity.id, ORGANIZADOR, UpdateActivityInfoRequest(name="Nuevo título"))
    guardada = recargar(db_session, activity)
    assert guardada.name == "Nuevo título"
    assert guardada.date.replace(tzinfo=None) == fecha.replace(tzinfo=None)


def test_no_se_reducen_los_cupos_por_debajo_de_los_inscritos(db_session, service):
    activity = crear_actividad(db_session, capacity=10)
    for user_id in ("a", "b", "c", "d", "e"):
        crear_solicitud(db_session, activity, user_id, "aceptada")
    with pytest.raises(CapacityLessThanRegisteredException):
        service.actualizar_cupos(activity.id, ORGANIZADOR, UpdateActivityCapacityRequest(capacity=3))
    service.actualizar_cupos(activity.id, ORGANIZADOR, UpdateActivityCapacityRequest(capacity=5))
    assert recargar(db_session, activity).capacity == 5


def test_cambiar_la_portada_guarda_la_nueva(db_session, service):
    activity = crear_actividad(db_session, image_url="http://x/vieja.webp")
    service.actualizar_portada(activity.id, ORGANIZADOR, b"nueva", "nueva.png")
    nueva = recargar(db_session, activity).image_url
    assert nueva != "http://x/vieja.webp"
    assert nueva.startswith("http://localhost:8000/uploads/activities/")


def test_solo_el_organizador_es_dueño(db_session):
    activity = crear_actividad(db_session)
    assert activity.is_owner(ORGANIZADOR)
    assert not activity.is_owner("otro")
    assert not activity.is_owner(None)
    with pytest.raises(ForbiddenException, match="Solo el organizador"):
        ensure_owner(activity, "otro", "Solo el organizador puede hacerlo.")


# ── Publicar, cerrar y reabrir ────────────────────────────────────────────────
def test_publicar_exige_ubicacion_descripcion_y_causa(db_session, service):
    activity = crear_actividad(db_session, status="draft")
    with pytest.raises(ValidationException) as exc_info:
        service.publicar(activity.id, ORGANIZADOR)
    mensaje = exc_info.value.message
    assert "ubicación en el mapa" in mensaje
    assert "descripción" in mensaje
    assert "al menos una causa temática" in mensaje
    assert activity.status == ActivityStatus.DRAFT


def test_publicar_exige_fecha_futura(db_session, service):
    activity = crear_actividad(db_session, status="draft", date=en_dias(-1))
    completar_para_publicar(db_session, activity)
    with pytest.raises(ValidationException, match="fecha futura válida"):
        service.publicar(activity.id, ORGANIZADOR)


def test_publicar_con_todo_completo(db_session, service):
    activity = crear_actividad(db_session, status="draft")
    completar_para_publicar(db_session, activity)
    service.publicar(activity.id, ORGANIZADOR)
    assert recargar(db_session, activity).status == ActivityStatus.ACTIVE


def test_reabrir_una_convocatoria_cerrada_futura(db_session, service):
    activity = crear_actividad(db_session, status="closed")
    service.reabrir(activity.id, ORGANIZADOR)
    assert recargar(db_session, activity).status == ActivityStatus.ACTIVE


def test_no_se_reabre_si_la_fecha_ya_paso(db_session, service):
    activity = crear_actividad(db_session, status="closed", date=en_dias(-1))
    with pytest.raises(ValidationException, match="ya ha transcurrido"):
        service.reabrir(activity.id, ORGANIZADOR)


def test_solo_se_reabren_las_cerradas(db_session, service):
    activity = crear_actividad(db_session, status="active")
    with pytest.raises(ValidationException, match="cerradas"):
        service.reabrir(activity.id, ORGANIZADOR)


# ── Cancelar ──────────────────────────────────────────────────────────────────
def test_cancelar_guarda_el_motivo_y_cambia_el_estado(db_session, service):
    activity = crear_actividad(db_session)
    cancelar(service, activity, f"  {MOTIVO}  ")
    guardada = recargar(db_session, activity)
    assert guardada.status == ActivityStatus.CANCELLED
    assert guardada.motivo_cancelacion == MOTIVO


@pytest.mark.parametrize("motivo", ["", "   ", None])
def test_el_motivo_es_obligatorio(db_session, service, motivo):
    activity = crear_actividad(db_session)
    with pytest.raises(MotivoCancelacionObligatorioException):
        cancelar(service, activity, motivo)
    assert activity.status == ActivityStatus.ACTIVE


def test_el_motivo_tiene_un_maximo(db_session, service):
    with pytest.raises(ValidationException, match="500"):
        cancelar(service, crear_actividad(db_session), "x" * 501)


def test_un_borrador_no_se_cancela(db_session, service):
    with pytest.raises(ValidationException, match="borrador"):
        cancelar(service, crear_actividad(db_session, status="draft"))


def test_una_actividad_que_ya_paso_no_se_cancela(db_session, service):
    with pytest.raises(ValidationException, match="ya pasó"):
        cancelar(service, crear_actividad(db_session, date=en_dias(-1)))


def test_una_convocatoria_cerrada_se_puede_cancelar(db_session, service):
    activity = crear_actividad(db_session, status="closed")
    cancelar(service, activity)
    assert recargar(db_session, activity).status == ActivityStatus.CANCELLED


def test_no_se_cancela_dos_veces(db_session, service):
    activity = crear_actividad(db_session)
    cancelar(service, activity)
    with pytest.raises(ActividadCanceladaException):
        cancelar(service, activity, "Otro motivo")


def test_una_actividad_cancelada_no_se_publica_ni_se_cierra(db_session, service):
    activity = crear_actividad(db_session)
    completar_para_publicar(db_session, activity)
    cancelar(service, activity)
    with pytest.raises(ActividadCanceladaException):
        service.publicar(activity.id, ORGANIZADOR)
    with pytest.raises(ActividadCanceladaException):
        service.cerrar(activity.id, ORGANIZADOR)


def test_una_actividad_cancelada_no_se_elimina(db_session, service):
    activity = crear_actividad(db_session)
    cancelar(service, activity)
    with pytest.raises(ActividadCanceladaException):
        service.eliminar(activity.id, ORGANIZADOR)


def test_no_se_elimina_con_inscritos(db_session, service):
    con_inscritos = crear_actividad(db_session)
    crear_solicitud(db_session, con_inscritos, "luis", "aceptada")
    with pytest.raises(ValidationException, match="participantes inscritos"):
        service.eliminar(con_inscritos.id, ORGANIZADOR)

    sin_inscritos = crear_actividad(db_session)
    service.eliminar(sin_inscritos.id, ORGANIZADOR)
    assert recargar(db_session, sin_inscritos) is None


# ── Detalle ───────────────────────────────────────────────────────────────────
def test_coordenadas_del_detalle():
    assert validate_coordinates(-17.3, -66.1) == (-17.3, -66.1)
    assert validate_coordinates(None, None) == (None, None)
    assert ActivityDetail(activity_id=None, latitude=-17.3, longitude=-66.1).has_location
    assert not ActivityDetail(activity_id=None).has_location

    with pytest.raises(ValueError, match="conjuntamente"):
        validate_coordinates(-17.3, None)
    with pytest.raises(InvalidActivityDetailException, match="latitud"):
        validate_coordinates(-91, 0)
    with pytest.raises(InvalidActivityDetailException, match="longitud"):
        validate_coordinates(0, 181)


def test_textos_del_detalle():
    assert validate_description("  Hola  ") == "Hola"
    assert validate_description("   ") is None
    with pytest.raises(InvalidActivityDetailException, match="5,000"):
        validate_description("x" * 5001)
    with pytest.raises(InvalidActivityDetailException, match="255"):
        validate_place("x" * 256)
