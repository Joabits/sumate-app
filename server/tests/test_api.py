"""
La API armada de punta a punta (app.main): rutas, inyección de cada service y
la forma única de los errores. Usa TestClient con la base en memoria y un
usuario autenticado de prueba, sin levantar el servidor.
"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.controllers import health_controller
from app.core import dependencies
from app.core.database import get_session
from app.core.errors import APIHTTPException
from app.core.security import get_current_user
from app.main import app
from tests.helpers import crear_actividad, crear_usuario, usuario

USUARIO = "persona_api"


@pytest.fixture
def engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture
def client(engine):
    def sesion():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = sesion
    app.dependency_overrides[get_current_user] = lambda: usuario(USUARIO)
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


# ── Cada ruta llega a su service ──────────────────────────────────────────────
@pytest.mark.parametrize(
    "ruta",
    [
        "/api/activities/causes",
        "/api/activities/explore",
        "/api/activities/my-activities",
        "/api/participaciones/me",
        "/api/horas/constancia",
        "/api/analitica",
    ],
)
def test_cada_ruta_responde_con_su_service(client, ruta):
    assert client.get(ruta).status_code == 200


def test_mis_datos_y_eliminar_la_cuenta_por_la_api(client, engine):
    with Session(engine) as session:
        crear_usuario(session, USUARIO, "Persona API")

    datos = client.get("/api/cuenta/mis-datos")
    assert datos.status_code == 200
    assert datos.json()["perfil"]["nombre"] == "Persona API"

    eliminada = client.delete("/api/cuenta")
    assert eliminada.status_code == 200
    assert eliminada.json()["solicitudesRetiradas"] == 0


def test_eliminar_la_cuenta_bloqueada_por_la_regla_responde_409(client, engine):
    with Session(engine) as session:
        crear_usuario(session, USUARIO, "Organiza")
        crear_actividad(session, owner_id=USUARIO)

    respuesta = client.delete("/api/cuenta")
    assert respuesta.status_code == 409
    assert respuesta.json()["error"]["code"]


# ── Todos los errores tienen la misma forma ───────────────────────────────────
def test_error_de_negocio_sale_con_su_codigo_y_estado(client):
    respuesta = client.get(f"/api/horas/actividades/{uuid4()}")
    assert respuesta.status_code == 404
    assert set(respuesta.json()["error"]) == {"code", "message"}


def test_error_de_validacion_del_request_dice_el_campo(client):
    respuesta = client.get("/api/horas/actividades/no-es-un-uuid")
    assert respuesta.status_code == 422
    error = respuesta.json()["error"]
    assert error["code"] == "SCHEMA_VALIDATION_ERROR"
    assert "activity_id" in error["message"]


def test_ruta_que_no_existe_sale_como_error_http(client):
    respuesta = client.get("/api/no-existe")
    assert respuesta.status_code == 404
    assert respuesta.json()["error"]["code"] == "HTTP_ERROR_404"


def test_error_http_con_codigo_propio_lo_conserva(client):
    def falla():
        raise APIHTTPException(status_code=401, code="SIN_SESION", message="Inicia sesión.")

    app.dependency_overrides[get_current_user] = falla
    respuesta = client.get("/api/horas/constancia")
    assert respuesta.status_code == 401
    assert respuesta.json() == {"error": {"code": "SIN_SESION", "message": "Inicia sesión."}}


def test_error_inesperado_responde_500_sin_detalles_internos(client):
    def explota():
        raise RuntimeError("detalle interno")

    app.dependency_overrides[dependencies.get_cause_service] = explota
    respuesta = client.get("/api/activities/causes")
    assert respuesta.status_code == 500
    assert respuesta.json()["error"]["code"] == "INTERNAL_SERVER_ERROR"
    assert "detalle interno" not in respuesta.text


# ── /health ───────────────────────────────────────────────────────────────────
def test_health_con_la_base_conectada(client, engine, monkeypatch):
    monkeypatch.setattr(health_controller, "engine", engine)
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json()["database"]["status"] == "connected"


def test_health_sin_base_responde_503(client, monkeypatch):
    class SinBase:
        def connect(self):
            raise ConnectionError("sin base")

    monkeypatch.setattr(health_controller, "engine", SinBase())
    respuesta = client.get("/health")
    assert respuesta.status_code == 503
    assert respuesta.json()["status"] == "degraded"
