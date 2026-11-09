"""Reglas de negocio del modelo Activity (sin base de datos)."""

from datetime import datetime, timedelta, timezone

import pytest

from app.models import Activity, ActivityDetail, ActivityStatus, BaseModel, Cause
from app.models.exceptions import (
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
from tests.helpers import IMAGEN, ORGANIZADOR, en_dias, nueva_actividad

MOTIVO = "Se suspendió por lluvia"


def crear(**kwargs) -> Activity:
    datos = {
        "name": "Reforestación San Pedro",
        "owner_id": "usr_123",
        "image_url": IMAGEN,
        "date": en_dias(2),
        "capacity": 15,
    }
    datos.update(kwargs)
    return Activity.create(**datos)


def completa() -> tuple[ActivityDetail, list[Cause]]:
    detail = ActivityDetail.create(
        activity_id=nueva_actividad().id, latitude=-17.3, longitude=-66.1, description="Hola"
    )
    return detail, [Cause.create(name="Salud", slug="salud")]


# ── Creación ──────────────────────────────────────────────────────────────────
def test_una_actividad_nueva_es_borrador():
    activity = crear(name="  Reforestación San Pedro  ")
    assert activity.status == ActivityStatus.DRAFT
    assert activity.capacity == 15
    assert activity.name == "Reforestación San Pedro"


@pytest.mark.parametrize("capacity", [0, -5])
def test_los_cupos_deben_ser_mayores_a_cero(capacity):
    with pytest.raises(ValueError, match="mayor a cero"):
        crear(capacity=capacity)


def test_los_cupos_no_superan_diez_mil():
    with pytest.raises(InvalidActivityCapacityException) as exc_info:
        crear(capacity=10001)
    assert isinstance(exc_info.value, ValidationException)
    assert isinstance(exc_info.value, ValueError)


def test_el_nombre_es_obligatorio():
    with pytest.raises(InvalidActivityNameException):
        crear(name="   ")


def test_no_se_crea_con_fecha_pasada():
    with pytest.raises(InvalidActivityDateException, match="posterior"):
        crear(date=datetime.now(timezone.utc) - timedelta(hours=1))


def test_una_fecha_sin_zona_horaria_se_toma_como_utc():
    futura = (datetime.now(timezone.utc) + timedelta(hours=2)).replace(tzinfo=None)
    pasada = (datetime.now(timezone.utc) - timedelta(hours=2)).replace(tzinfo=None)
    Activity.ensure_future_date(futura)
    with pytest.raises(InvalidActivityDateException):
        Activity.ensure_future_date(pasada)


def test_borrado_logico_y_restauracion():
    model = BaseModel()
    assert model.deleted_date is None
    model.soft_delete()
    assert model.deleted_date is not None
    model.restore()
    assert model.deleted_date is None


# ── Edición ───────────────────────────────────────────────────────────────────
def test_reprogramar_a_una_fecha_pasada_falla():
    activity = nueva_actividad()
    with pytest.raises(InvalidActivityDateException):
        activity.update_info(date=en_dias(-1))


def test_cambiar_solo_el_titulo_conserva_la_fecha():
    activity = nueva_actividad()
    fecha = activity.date
    activity.update_info(name="Nuevo título")
    assert activity.name == "Nuevo título"
    assert activity.date == fecha


def test_no_se_reducen_los_cupos_por_debajo_de_los_inscritos():
    activity = nueva_actividad(capacity=10)
    with pytest.raises(CapacityLessThanRegisteredException):
        activity.update_capacity(3, registered_count=5)
    activity.update_capacity(5, registered_count=5)
    assert activity.capacity == 5


def test_cambiar_la_imagen_devuelve_la_anterior():
    activity = nueva_actividad(image_url="http://x/vieja.webp")
    assert activity.update_image("http://x/nueva.webp") == "http://x/vieja.webp"
    assert activity.image_url == "http://x/nueva.webp"


def test_solo_el_organizador_es_dueño():
    activity = nueva_actividad()
    assert activity.is_owner(ORGANIZADOR)
    assert not activity.is_owner("otro")
    assert not activity.is_owner(None)
    with pytest.raises(ForbiddenException, match="Solo el organizador"):
        activity.ensure_owner("otro", "Solo el organizador puede hacerlo.")


# ── Publicar, cerrar y reabrir ────────────────────────────────────────────────
def test_publicar_exige_ubicacion_descripcion_y_causa():
    activity = nueva_actividad(status="draft")
    with pytest.raises(ValidationException) as exc_info:
        activity.publish(None, [])
    mensaje = exc_info.value.message
    assert "ubicación en el mapa" in mensaje
    assert "descripción" in mensaje
    assert "al menos una causa temática" in mensaje
    assert activity.status == ActivityStatus.DRAFT


def test_publicar_exige_fecha_futura():
    activity = nueva_actividad(status="draft", date=en_dias(-1))
    with pytest.raises(ValidationException, match="fecha futura válida"):
        activity.publish(*completa())


def test_publicar_con_todo_completo():
    activity = nueva_actividad(status="draft")
    activity.publish(*completa())
    assert activity.status == ActivityStatus.ACTIVE


def test_reabrir_una_convocatoria_cerrada_futura():
    activity = nueva_actividad(status="closed")
    activity.reopen()
    assert activity.status == ActivityStatus.ACTIVE


def test_no_se_reabre_si_la_fecha_ya_paso():
    activity = nueva_actividad(status="closed", date=en_dias(-1))
    with pytest.raises(ValidationException, match="ya ha transcurrido"):
        activity.reopen()


def test_solo_se_reabren_las_cerradas():
    with pytest.raises(ValidationException, match="cerradas"):
        nueva_actividad(status="active").reopen()


# ── Cancelar ──────────────────────────────────────────────────────────────────
def test_cancelar_guarda_el_motivo_y_cambia_el_estado():
    activity = nueva_actividad()
    activity.cancelar(f"  {MOTIVO}  ")
    assert activity.status == ActivityStatus.CANCELLED
    assert activity.motivo_cancelacion == MOTIVO


@pytest.mark.parametrize("motivo", ["", "   ", None])
def test_el_motivo_es_obligatorio(motivo):
    activity = nueva_actividad()
    with pytest.raises(MotivoCancelacionObligatorioException):
        activity.cancelar(motivo)
    assert activity.status == ActivityStatus.ACTIVE


def test_el_motivo_tiene_un_maximo():
    with pytest.raises(ValidationException, match="500"):
        nueva_actividad().cancelar("x" * 501)


def test_un_borrador_no_se_cancela():
    with pytest.raises(ValidationException, match="borrador"):
        nueva_actividad(status="draft").cancelar(MOTIVO)


def test_una_actividad_que_ya_paso_no_se_cancela():
    with pytest.raises(ValidationException, match="ya pasó"):
        nueva_actividad(date=en_dias(-1)).cancelar(MOTIVO)


def test_una_convocatoria_cerrada_se_puede_cancelar():
    activity = nueva_actividad(status="closed")
    activity.cancelar(MOTIVO)
    assert activity.status == ActivityStatus.CANCELLED


def test_no_se_cancela_dos_veces():
    activity = nueva_actividad()
    activity.cancelar(MOTIVO)
    with pytest.raises(ActividadCanceladaException):
        activity.cancelar("Otro motivo")


def test_una_actividad_cancelada_no_se_publica_ni_se_cierra():
    activity = nueva_actividad()
    activity.cancelar(MOTIVO)
    with pytest.raises(ActividadCanceladaException):
        activity.publish(*completa())
    with pytest.raises(ActividadCanceladaException):
        activity.close()


def test_una_actividad_cancelada_no_se_elimina():
    activity = nueva_actividad()
    activity.cancelar(MOTIVO)
    with pytest.raises(ActividadCanceladaException):
        activity.ensure_can_be_deleted(registered_count=0)


def test_no_se_elimina_con_inscritos():
    with pytest.raises(ValidationException, match="participantes inscritos"):
        nueva_actividad().ensure_can_be_deleted(registered_count=1)
    nueva_actividad().ensure_can_be_deleted(registered_count=0)


# ── Detalle ───────────────────────────────────────────────────────────────────
def test_coordenadas_del_detalle():
    activity_id = nueva_actividad().id
    detail = ActivityDetail.create(activity_id=activity_id, latitude=-17.3, longitude=-66.1)
    assert (detail.latitude, detail.longitude) == (-17.3, -66.1)
    assert detail.has_location

    sin_ubicacion = ActivityDetail.create(activity_id=activity_id)
    assert not sin_ubicacion.has_location

    with pytest.raises(ValueError, match="conjuntamente"):
        ActivityDetail.create(activity_id=activity_id, latitude=-17.3)
    with pytest.raises(InvalidActivityDetailException, match="latitud"):
        ActivityDetail.create(activity_id=activity_id, latitude=-91, longitude=0)
    with pytest.raises(InvalidActivityDetailException, match="longitud"):
        ActivityDetail.create(activity_id=activity_id, latitude=0, longitude=181)


def test_textos_del_detalle():
    detail = ActivityDetail.create(activity_id=nueva_actividad().id, description="  Hola  ")
    assert detail.description == "Hola"
    detail.update_description("   ")
    assert detail.description is None
    with pytest.raises(InvalidActivityDetailException, match="5,000"):
        detail.update_description("x" * 5001)
    with pytest.raises(InvalidActivityDetailException, match="255"):
        detail.update_location(latitude=0, longitude=0, place="x" * 256)
