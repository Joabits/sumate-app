"""Reglas de CuentaService: Mis datos y eliminar la cuenta (Tarea 10)."""

from datetime import date

import pytest
from sqlmodel import select

from app.entities import Activity, EstadoHoras, RegistroHoras, User
from app.exceptions import CuentaConActividadesPorTerminarException
from app.services.cuenta_service import CuentaService
from tests.helpers import crear_actividad, crear_solicitud, crear_usuario, en_dias, estados


@pytest.fixture
def service(db_session) -> CuentaService:
    return CuentaService(db_session)


def registrar_horas(
    db_session, activity, user_id, estado, horas=4.0, motivo=None, jornada=date(2026, 10, 1)
) -> RegistroHoras:
    registro = RegistroHoras(
        activity_id=activity.id,
        user_id=user_id,
        jornada=jornada,
        horas=horas,
        estado=estado,
        motivo_reclamo=motivo,
    )
    db_session.add(registro)
    db_session.commit()
    return registro


# ── Mis datos ─────────────────────────────────────────────────────────────────
def test_mis_datos_trae_perfil_solicitudes_horas_y_actividades(db_session, service):
    crear_usuario(db_session, "maria", "María")
    propia = crear_actividad(db_session, owner_id="maria", name="Huerto comunitario", status="draft")
    otra = crear_actividad(db_session, name="Taller", date=en_dias(-5))
    crear_solicitud(db_session, otra, "maria", "aceptada")
    registrar_horas(db_session, otra, "maria", EstadoHoras.CONFIRMADA.value)

    datos = service.mis_datos("maria", "maria@example.com")

    assert datos.perfil.nombre == "María"
    assert datos.perfil.correo == "maria@example.com"
    assert [a.nombre for a in datos.actividades_organizadas] == [propia.name]
    assert [(s.actividad, s.estado) for s in datos.solicitudes] == [("Taller", "aceptada")]
    assert [(h.actividad, h.horas, h.estado) for h in datos.horas] == [("Taller", 4.0, "confirmada")]
    # Un borrador no frena la eliminación
    assert datos.actividades_por_terminar == []


def test_mis_datos_sale_en_camel_case(db_session, service):
    crear_usuario(db_session, "maria", "María")
    json = service.mis_datos("maria", "maria@example.com").model_dump(by_alias=True)
    assert {"perfil", "actividadesOrganizadas", "solicitudes", "horas", "actividadesPorTerminar"} <= set(json)


# ── Regla que bloquea ─────────────────────────────────────────────────────────
@pytest.mark.parametrize("estado", ["active", "closed"])
def test_no_se_elimina_si_organiza_actividades_que_no_terminaron(db_session, service, estado):
    crear_usuario(db_session, "ana", "Ana")
    crear_actividad(db_session, owner_id="ana", name="Jornada de limpieza", status=estado)

    with pytest.raises(CuentaConActividadesPorTerminarException) as error:
        service.eliminar("ana")

    # El mensaje dice por qué y qué hacer
    assert "Jornada de limpieza" in error.value.message
    assert "Cancélalas" in error.value.message
    # Nada cambió: la cuenta sigue
    assert db_session.get(User, "ana") is not None


def test_las_actividades_pasadas_canceladas_o_borradores_no_bloquean(db_session, service):
    crear_usuario(db_session, "ana", "Ana")
    pasada = crear_actividad(db_session, owner_id="ana", name="Pasada", date=en_dias(-3))
    crear_actividad(db_session, owner_id="ana", name="Cancelada", status="cancelled")
    crear_actividad(db_session, owner_id="ana", name="Borrador", status="draft")

    service.eliminar("ana")

    db_session.expire_all()
    assert db_session.get(User, "ana") is None
    # La actividad pasada se conserva para sus voluntarios, sin organizador
    assert db_session.get(Activity, pasada.id).creator_name is None
    restantes = db_session.exec(select(Activity).where(Activity.owner_id == "ana")).all()
    assert restantes == []


# ── Eliminación completa ──────────────────────────────────────────────────────
def test_eliminar_retira_solicitudes_vivas_y_libera_el_cupo(db_session, service):
    crear_usuario(db_session, "maria", "María")
    pendiente = crear_actividad(db_session, name="Pendiente")
    crear_solicitud(db_session, pendiente, "maria", "pendiente")
    espera = crear_actividad(db_session, name="Espera")
    crear_solicitud(db_session, espera, "maria", "en_espera")
    llena = crear_actividad(db_session, name="Llena", capacity=1)
    crear_solicitud(db_session, llena, "maria", "aceptada")
    crear_solicitud(db_session, llena, "carlos", "en_espera")

    resultado = service.eliminar("maria")

    assert resultado.solicitudes_retiradas == 3
    assert resultado.cupos_liberados == 1
    # El primero en espera entra al cupo que se liberó
    assert estados(db_session, llena)["carlos"] == "aceptada"
    for activity in (pendiente, espera, llena):
        estados_actividad = estados(db_session, activity)
        assert "maria" not in estados_actividad
        assert "retirada" in estados_actividad.values()


def test_las_horas_confirmadas_se_conservan_sin_datos_personales(db_session, service):
    crear_usuario(db_session, "maria", "María")
    pasada = crear_actividad(db_session, name="Taller", date=en_dias(-5))
    crear_solicitud(db_session, pasada, "maria", "aceptada")
    confirmada = registrar_horas(db_session, pasada, "maria", EstadoHoras.CONFIRMADA.value, horas=5)
    registrar_horas(
        db_session,
        pasada,
        "maria",
        EstadoHoras.RECLAMADA.value,
        motivo="Fueron 6 horas",
        jornada=date(2026, 10, 2),
    )

    resultado = service.eliminar("maria")

    assert resultado.horas_confirmadas_conservadas == 1
    db_session.expire_all()
    registros = db_session.exec(select(RegistroHoras)).all()
    # Solo queda la confirmada, con las mismas horas y sin nombre ni id de la persona
    assert [r.id for r in registros] == [confirmada.id]
    assert registros[0].horas == 5
    assert registros[0].user_id.startswith("eliminado-")
    assert registros[0].user_name == "Usuario eliminado"
    # El aceptado de una actividad que ya pasó se conserva (sus horas lo necesitan), anónimo
    assert list(estados(db_session, pasada).values()) == ["aceptada"]
    assert "maria" not in estados(db_session, pasada)


def test_despues_de_eliminar_no_queda_la_fila_de_better_auth(db_session, service):
    crear_usuario(db_session, "pedro", "Pedro")
    service.eliminar("pedro")
    db_session.expire_all()
    assert db_session.get(User, "pedro") is None
