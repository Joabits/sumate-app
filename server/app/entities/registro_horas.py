"""
Horas de voluntariado por jornada.

    pendiente ──aceptar──▶ confirmada        (solo estas suman al total y a la constancia)
        │  ▲
  reclamar  corregir
        ▼  │
     reclamada

Las reglas de cada paso están en app/services/horas_service.py.
"""

from datetime import date
from enum import StrEnum
from typing import Optional
from uuid import UUID

from sqlalchemy import Date
from sqlmodel import Field, Relationship, UniqueConstraint

from app.entities.activity import Activity
from app.entities.base import BaseEntity
from app.entities.user import User

MAX_MOTIVO_RECLAMO = 500


class EstadoHoras(StrEnum):
    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    RECLAMADA = "reclamada"


class RegistroHoras(BaseEntity, table=True):
    """Horas de un participante en una jornada de la actividad."""

    __tablename__ = "registros_horas"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", "jornada", name="uq_registro_horas_jornada"),
    )

    activity_id: UUID = Field(foreign_key="activity.id", index=True, nullable=False)
    user_id: str = Field(index=True, nullable=False)
    # Día de la jornada (hora de Bolivia)
    jornada: date = Field(sa_type=Date, nullable=False)
    horas: float = Field(nullable=False)
    estado: str = Field(default=EstadoHoras.PENDIENTE.value, max_length=20, index=True, nullable=False)
    # Lo que escribió el voluntario al reclamar (se conserva como historial)
    motivo_reclamo: str | None = Field(default=None, max_length=MAX_MOTIVO_RECLAMO, nullable=True)
    # Horas antes de la última corrección, para mostrar "4 h → 5 h"
    horas_anteriores: float | None = Field(default=None, nullable=True)

    user: Optional[User] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(RegistroHoras.user_id) == User.id",
            "viewonly": True,
            "lazy": "selectin",
        }
    )
    activity: Optional[Activity] = Relationship(sa_relationship_kwargs={"viewonly": True})

    # ── Getters ───────────────────────────────────────────────────────────────
    @property
    def user_name(self) -> str:
        return self.user.name if self.user and self.user.name else "Usuario"

    @property
    def user_image(self) -> str | None:
        return self.user.image if self.user else None

    @property
    def esta_confirmada(self) -> bool:
        return self.estado == EstadoHoras.CONFIRMADA
