from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

import app.entities  # noqa: F401  registra todas las tablas en SQLModel.metadata
from app.core.config import settings

# ── Argumentos condicionales según el motor ───────────────────────────────────
connect_args = {"check_same_thread": False} if settings.is_sqlite else {}
pool_pre_ping = not settings.is_sqlite  # ping preventivo solo en PostgreSQL

engine = create_engine(
    settings.database_url_normalized,
    echo=settings.SQL_ECHO,
    connect_args=connect_args,
    pool_pre_ping=pool_pre_ping,
)


def init_db() -> None:
    """
    Crea las tablas definidas en los modelos.

    Úsalo SOLO en DEV con SQLite. En PostgreSQL las tablas las crea
    `alembic upgrade head`.
    """
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """Una sesión de BD por request. Si el controlador no hace commit, nada se guarda."""
    with Session(engine) as session:
        yield session


DBSession = Annotated[Session, Depends(get_session)]
"""Sesión de BD inyectada en los controladores."""
