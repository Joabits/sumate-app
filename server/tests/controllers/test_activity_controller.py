"""Endpoints de /activities, llamados como funciones con una base en memoria."""

import io
from uuid import uuid4

import pytest
from fastapi import UploadFile
from sqlmodel import select

from app.repositories.activity_detail_repository import ActivityDetailRepository
from app.repositories.cause_repository import CauseRepository
from app.services import activity_service
from app.services.activity_service import ActivityService
from app.services.cause_service import CauseService
from app.controllers import activity_controller as ctrl
from app.controllers.cause_controller import list_causes
from app.entities import Activity, ActivityCause, ActivityDetail, Cause, Participation
from app.exceptions import (
    ActividadCanceladaException,
    ActivityNotFoundException,
    CapacityLessThanRegisteredException,
    ForbiddenException,
    InvalidActivityDateException,
    InvalidActivityImageException,
    ValidationException,
)
from app.dtos.activity_dto import (
    CapacityRangeFilter,
    CreateActivityRequest,
    DatePresetFilter,
    TimeOfDayFilter,
    UpdateActivityCapacityRequest,
    UpdateActivityInfoRequest,
    UpdateDescriptionRequest,
    UpdateLocationRequest,
)
from app.dtos.cause_dto import ReplaceActivityCausesRequest
from tests.helpers import (
    ORGANIZADOR,
    completar_para_publicar,
    crear_actividad,
    crear_causa,
    crear_solicitud,
    crear_usuario,
    en_dias,
    estados,
    recargar,
    run,
    usuario,
)

ORG = usuario(ORGANIZADOR)
OTRO = usuario("otro")


def imagen(contenido: bytes = b"imagen", nombre: str = "foto.png") -> UploadFile:
    return UploadFile(file=io.BytesIO(contenido), filename=nombre)


def buscar(session, **filtros):
    datos = {
        "q": None,
        "time_of_day": TimeOfDayFilter.any,
        "date_preset": DatePresetFilter.upcoming,
        "capacity_range": CapacityRangeFilter.any,
        "cause_ids": [],
        "user_lat": None,
        "user_lon": None,
        "max_distance_km": None,
    }
    datos.update(filtros)
    return ctrl.search_activities(ActivityService(session), **datos)


# ── Crear ─────────────────────────────────────────────────────────────────────
def test_crear_actividad_guarda_un_borrador_con_su_imagen(db_session, uploads_dir):
    payload = CreateActivityRequest(name="Feria", date=en_dias(5), capacity=20)
    response = run(ctrl.create_activity(payload, ORG, ActivityService(db_session), imagen()))

    assert response.status_code == 201
    activity = db_session.exec(select(Activity)).one()
    assert (activity.name, activity.owner_id, activity.status, activity.capacity) == (
        "Feria", ORGANIZADOR, "draft", 20
    )
    assert len(list(uploads_dir.iterdir())) == 1


def test_crear_con_fecha_pasada_falla_y_borra_la_imagen(db_session, uploads_dir):
    payload = CreateActivityRequest(name="Feria", date=en_dias(-1), capacity=20)
    with pytest.raises(InvalidActivityDateException):
        run(ctrl.create_activity(payload, ORG, ActivityService(db_session), imagen()))
    assert list(uploads_dir.iterdir()) == []
    assert db_session.exec(select(Activity)).all() == []


@pytest.mark.parametrize(
    "archivo, mensaje",
    [
        (imagen(b""), "vacío"),
        (imagen(b"x" * (2 * 1024 * 1024 + 1)), "2MB"),
        (imagen(b"texto", "archivo.txt"), "Formato no permitido"),
    ],
)
def test_crear_rechaza_imagenes_invalidas(db_session, uploads_dir, archivo, mensaje):
    payload = CreateActivityRequest(name="Feria", date=en_dias(5), capacity=2)
    with pytest.raises(InvalidActivityImageException, match=mensaje):
        run(ctrl.create_activity(payload, ORG, ActivityService(db_session), archivo))


def test_el_formulario_de_creacion_lee_la_fecha_iso():
    req = CreateActivityRequest.as_form(name="Taller de Cocina", date="2026-12-01T15:30:00Z", capacity=20)
    assert (req.name, req.capacity, req.date.year) == ("Taller de Cocina", 20, 2026)
    assert req.date.tzinfo is not None
    with pytest.raises(InvalidActivityDateException):
        CreateActivityRequest.as_form(name="x", date="mañana", capacity=1)


# ── Listas ────────────────────────────────────────────────────────────────────
def test_explorar_muestra_las_activas_futuras_de_otros(db_session):
    crear_usuario(db_session, ORGANIZADOR, "Ana Pérez", "https://example.com/ana.jpg")
    visible = crear_actividad(db_session, name="Visible", capacity=5)
    crear_actividad(db_session, name="Borrador", status="draft")
    crear_actividad(db_session, name="Pasada", date=en_dias(-1))
    crear_actividad(db_session, name="Mía", owner_id="otro")
    salud = crear_causa(db_session, "Salud")
    db_session.add(ActivityCause(activity_id=visible.id, cause_id=salud.id))
    crear_solicitud(db_session, visible, "luis", "aceptada")
    crear_solicitud(db_session, visible, "maria", "pendiente")

    result = ctrl.list_explore_activities(OTRO, ActivityService(db_session))

    assert [i.name for i in result.items] == ["Visible"]
    item = result.items[0]
    assert (item.creator_name, item.creator_image) == ("Ana Pérez", "https://example.com/ana.jpg")
    assert [c.name for c in item.causes] == ["Salud"]
    assert item.registered_count == 1


def test_mis_actividades_incluye_borradores_con_inscritos(db_session):
    borrador = crear_actividad(db_session, name="Borrador", status="draft")
    activa = crear_actividad(db_session, name="Activa")
    crear_actividad(db_session, name="De otro", owner_id="otro")
    crear_solicitud(db_session, activa, "luis", "aceptada")

    result = ctrl.list_my_activities(ORG, ActivityService(db_session))

    # La más reciente primero
    assert [i.id for i in result.items] == [activa.id, borrador.id]
    assert [i.registered_count for i in result.items] == [1, 0]


def test_buscar_devuelve_inscritos_y_organizador(db_session):
    crear_usuario(db_session, ORGANIZADOR, "Carlos Ruiz")
    feria = crear_actividad(db_session, name="Feria Solidaria", capacity=3)
    crear_actividad(db_session, name="Otra cosa")
    crear_solicitud(db_session, feria, "luis", "aceptada")

    result = buscar(db_session, q="feria")

    assert [i.name for i in result.items] == ["Feria Solidaria"]
    assert (result.items[0].capacity, result.items[0].registered_count) == (3, 1)
    assert result.items[0].creator_name == "Carlos Ruiz"


def test_catalogo_de_causas_ordenado(db_session):
    crear_causa(db_session, "Salud")
    crear_causa(db_session, "Animales")
    assert [c.name for c in list_causes(CauseService(db_session)).items] == ["Animales", "Salud"]


# ── Detalle ───────────────────────────────────────────────────────────────────
def test_un_borrador_solo_lo_ve_su_organizador(db_session):
    borrador = crear_actividad(db_session, status="draft")
    assert ctrl.get_activity_detail(borrador.id, ORG, ActivityService(db_session)).is_owner
    with pytest.raises(ActivityNotFoundException):
        ctrl.get_activity_detail(borrador.id, OTRO, ActivityService(db_session))
    with pytest.raises(ActivityNotFoundException):
        ctrl.get_activity_detail(uuid4(), ORG, ActivityService(db_session))


def test_detalle_con_participantes_ubicacion_y_causas(db_session):
    crear_usuario(db_session, "luis", "Luis Mamani", "https://example.com/luis.jpg")
    activity = crear_actividad(db_session)
    completar_para_publicar(db_session, activity)
    crear_solicitud(db_session, activity, "luis", "aceptada")

    detalle = ctrl.get_activity_detail(activity.id, usuario("luis"), ActivityService(db_session))

    assert detalle.is_participating
    assert detalle.estado_solicitud == "aceptada"
    assert [(p.id, p.name, p.image) for p in detalle.participants] == [
        ("luis", "Luis Mamani", "https://example.com/luis.jpg")
    ]
    assert detalle.detail.place == "Plaza Colón"
    assert [c.name for c in detalle.causes] == ["Salud"]
    # Un voluntario no ve las solicitudes de los demás
    assert detalle.solicitudes_pendientes == []
    assert detalle.lista_de_espera == []


def test_el_voluntario_ve_su_puesto_y_el_organizador_la_lista_completa(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    crear_solicitud(db_session, activity, "maria", "pendiente")
    for user_id in ("sofia", "carlos"):
        crear_solicitud(db_session, activity, user_id, "en_espera")

    del_organizador = ctrl.get_activity_detail(activity.id, ORG, ActivityService(db_session))
    assert [p.id for p in del_organizador.solicitudes_pendientes] == ["maria"]
    assert [p.id for p in del_organizador.lista_de_espera] == ["sofia", "carlos"]
    assert del_organizador.posicion_en_espera is None

    de_carlos = ctrl.get_activity_detail(activity.id, usuario("carlos"), ActivityService(db_session))
    assert de_carlos.estado_solicitud == "en_espera"
    assert de_carlos.posicion_en_espera == 2
    assert de_carlos.lista_de_espera == []
    # Sin nombre en la base se muestra "Usuario"
    assert [p.name for p in de_carlos.participants] == ["Usuario"]


# ── Edición ───────────────────────────────────────────────────────────────────
def test_solo_el_organizador_edita(db_session):
    activity = crear_actividad(db_session)
    with pytest.raises(ForbiddenException):
        ctrl.update_activity_info(activity.id, UpdateActivityInfoRequest(name="X"), OTRO, ActivityService(db_session))
    with pytest.raises(ForbiddenException):
        ctrl.update_activity_capacity(activity.id, UpdateActivityCapacityRequest(capacity=3), OTRO, ActivityService(db_session))
    with pytest.raises(ForbiddenException):
        ctrl.update_activity_description(activity.id, UpdateDescriptionRequest(description="X"), OTRO, ActivityService(db_session))
    with pytest.raises(ForbiddenException):
        ctrl.close_activity(activity.id, OTRO, ActivityService(db_session))
    with pytest.raises(ActivityNotFoundException):
        ctrl.close_activity(uuid4(), ORG, ActivityService(db_session))


def test_editar_titulo_y_fecha(db_session):
    activity = crear_actividad(db_session)
    nueva_fecha = en_dias(10)
    ctrl.update_activity_info(
        activity.id, UpdateActivityInfoRequest(name="Nuevo", date=nueva_fecha), ORG, ActivityService(db_session)
    )
    guardada = recargar(db_session, activity)
    assert guardada.name == "Nuevo"
    assert guardada.date.replace(tzinfo=None) == nueva_fecha.replace(tzinfo=None)

    with pytest.raises(InvalidActivityDateException):
        ctrl.update_activity_info(
            activity.id, UpdateActivityInfoRequest(date=en_dias(-1)), ORG, ActivityService(db_session)
        )


def test_editar_cupos(db_session):
    activity = crear_actividad(db_session, capacity=5)
    for user_id in ("luis", "ana"):
        crear_solicitud(db_session, activity, user_id, "aceptada")

    with pytest.raises(CapacityLessThanRegisteredException):
        ctrl.update_activity_capacity(activity.id, UpdateActivityCapacityRequest(capacity=1), ORG, ActivityService(db_session))

    ctrl.update_activity_capacity(activity.id, UpdateActivityCapacityRequest(capacity=2), ORG, ActivityService(db_session))
    assert recargar(db_session, activity).capacity == 2


def test_al_agregar_cupos_entran_los_primeros_en_espera(db_session):
    activity = crear_actividad(db_session, capacity=1)
    crear_solicitud(db_session, activity, "luis", "aceptada")
    for user_id in ("sofia", "carlos", "pedro"):
        crear_solicitud(db_session, activity, user_id, "en_espera")

    ctrl.update_activity_capacity(activity.id, UpdateActivityCapacityRequest(capacity=3), ORG, ActivityService(db_session))

    assert estados(db_session, activity) == {
        "luis": "aceptada",
        "sofia": "aceptada",
        "carlos": "aceptada",
        "pedro": "en_espera",
    }


def test_editar_descripcion_crea_el_detalle(db_session):
    activity = crear_actividad(db_session)
    ctrl.update_activity_description(activity.id, UpdateDescriptionRequest(description=" Hola "), ORG, ActivityService(db_session))
    ctrl.update_activity_description(activity.id, UpdateDescriptionRequest(description="Chau"), ORG, ActivityService(db_session))
    db_session.expire_all()
    assert ActivityDetailRepository(db_session).find_by_activity(activity.id).description == "Chau"


def test_editar_ubicacion_usa_la_direccion_del_mapa(db_session, monkeypatch):
    async def geocode_falso(lat, lon):
        return "Lugar", "Av. Ballivián, Cochabamba"

    monkeypatch.setattr(activity_service, "reverse_geocode", geocode_falso)
    activity = crear_actividad(db_session)

    run(ctrl.update_activity_location(
        activity.id, UpdateLocationRequest(latitude=-17.39, longitude=-66.15), ORG, ActivityService(db_session)
    ))
    detail = ActivityDetailRepository(db_session).find_by_activity(activity.id)
    assert (detail.latitude, detail.place, detail.address) == (
        -17.39, "Ubicación por definir", "Av. Ballivián, Cochabamba"
    )

    run(ctrl.update_activity_location(
        activity.id, UpdateLocationRequest(latitude=-17.4, longitude=-66.2, place="Plaza"), ORG, ActivityService(db_session)
    ))
    db_session.expire_all()
    assert ActivityDetailRepository(db_session).find_by_activity(activity.id).place == "Plaza"


def test_cambiar_imagen_borra_la_anterior(db_session, uploads_dir):
    from app.core.storage import save_activity_image

    vieja = save_activity_image(b"vieja", filename="vieja.png")
    activity = crear_actividad(db_session, image_url=vieja)

    run(ctrl.update_activity_image(activity.id, ORG, ActivityService(db_session), imagen()))

    nueva = recargar(db_session, activity).image_url
    assert nueva != vieja
    assert [f.name for f in uploads_dir.iterdir()] == [nueva.rsplit("/", 1)[-1]]


def test_si_no_es_el_organizador_la_imagen_nueva_se_borra(db_session, uploads_dir):
    activity = crear_actividad(db_session)
    with pytest.raises(ForbiddenException):
        run(ctrl.update_activity_image(activity.id, OTRO, ActivityService(db_session), imagen()))
    assert list(uploads_dir.iterdir()) == []


# ── Causas ────────────────────────────────────────────────────────────────────
def test_reemplazar_causas(db_session):
    activity = crear_actividad(db_session, status="draft")
    salud, animales = crear_causa(db_session, "Salud"), crear_causa(db_session, "Animales")

    ctrl.replace_activity_causes(
        activity.id, ReplaceActivityCausesRequest(cause_ids=[salud.id, salud.id]), ORG, ActivityService(db_session)
    )
    # Volver a guardar una causa que ya tenía no choca con la restricción única
    ctrl.replace_activity_causes(
        activity.id, ReplaceActivityCausesRequest(cause_ids=[salud.id, animales.id]), ORG, ActivityService(db_session)
    )
    assert [c.name for c in CauseRepository(db_session).find_by_activity(activity.id)] == ["Animales", "Salud"]

    # Un borrador puede quedar sin causas
    ctrl.replace_activity_causes(activity.id, ReplaceActivityCausesRequest(cause_ids=[]), ORG, ActivityService(db_session))
    assert CauseRepository(db_session).find_by_activity(activity.id) == []


def test_causas_inexistentes_o_actividad_publicada_sin_causas(db_session):
    activity = crear_actividad(db_session, status="active")
    with pytest.raises(ValidationException, match="no existen"):
        ctrl.replace_activity_causes(
            activity.id, ReplaceActivityCausesRequest(cause_ids=[uuid4()]), ORG, ActivityService(db_session)
        )
    with pytest.raises(ValidationException, match="al menos una causa"):
        ctrl.replace_activity_causes(activity.id, ReplaceActivityCausesRequest(cause_ids=[]), ORG, ActivityService(db_session))


# ── Publicar, cerrar, reabrir ─────────────────────────────────────────────────
def test_publicar_cerrar_y_reabrir(db_session):
    activity = crear_actividad(db_session, status="draft")
    with pytest.raises(ValidationException, match="ubicación en el mapa"):
        ctrl.publish_activity(activity.id, ORG, ActivityService(db_session))
    db_session.rollback()

    completar_para_publicar(db_session, activity)
    with pytest.raises(ForbiddenException):
        ctrl.publish_activity(activity.id, OTRO, ActivityService(db_session))

    ctrl.publish_activity(activity.id, ORG, ActivityService(db_session))
    assert recargar(db_session, activity).status == "active"
    ctrl.close_activity(activity.id, ORG, ActivityService(db_session))
    assert recargar(db_session, activity).status == "closed"
    ctrl.reopen_activity(activity.id, ORG, ActivityService(db_session))
    assert recargar(db_session, activity).status == "active"


def test_no_se_reabre_una_actividad_pasada(db_session):
    activity = crear_actividad(db_session, status="closed", date=en_dias(-1))
    with pytest.raises(ValidationException, match="ya ha transcurrido"):
        ctrl.reopen_activity(activity.id, ORG, ActivityService(db_session))


# ── Eliminar ──────────────────────────────────────────────────────────────────
def test_eliminar_borra_la_actividad_su_detalle_causas_solicitudes_e_imagen(db_session, uploads_dir):
    from app.core.storage import save_activity_image

    activity = crear_actividad(db_session, image_url=save_activity_image(b"x", filename="a.png"))
    completar_para_publicar(db_session, activity)
    crear_solicitud(db_session, activity, "maria", "pendiente")
    crear_solicitud(db_session, activity, "carlos", "rechazada")

    response = ctrl.delete_activity(activity.id, ORG, ActivityService(db_session))

    assert response.status_code == 204
    db_session.expire_all()
    assert db_session.get(Activity, activity.id) is None
    for model in (ActivityDetail, ActivityCause, Participation):
        assert db_session.exec(select(model)).all() == []
    assert list(uploads_dir.iterdir()) == []


def test_no_se_elimina_con_inscritos_ni_cancelada(db_session):
    con_inscritos = crear_actividad(db_session)
    crear_solicitud(db_session, con_inscritos, "luis", "aceptada")
    with pytest.raises(ValidationException, match="participantes inscritos"):
        ctrl.delete_activity(con_inscritos.id, ORG, ActivityService(db_session))

    cancelada = crear_actividad(db_session, status="cancelled")
    with pytest.raises(ActividadCanceladaException):
        ctrl.delete_activity(cancelada.id, ORG, ActivityService(db_session))
    with pytest.raises(ForbiddenException):
        ctrl.delete_activity(con_inscritos.id, OTRO, ActivityService(db_session))
