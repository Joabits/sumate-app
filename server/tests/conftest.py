"""
Fixtures de las pruebas: una base SQLite en memoria con todas las tablas y
una carpeta temporal para las imágenes. Los ayudantes están en tests/helpers.py.
"""

import pytest
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

import app.entities  # noqa: F401  registra las tablas
from app.core.config import settings


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")

    # SQLite no trae least/greatest; la búsqueda por distancia las usa
    @event.listens_for(engine, "connect")
    def _sqlite_connect(dbapi_connection, connection_record):
        dbapi_connection.create_function("least", -1, min)
        dbapi_connection.create_function("greatest", -1, max)

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def uploads_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_URL", "http://localhost:8000")
    return tmp_path / "activities"
