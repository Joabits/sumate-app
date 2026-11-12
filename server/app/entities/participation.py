from enum import StrEnum
from typing import Optional
from uuid import UUID

from sqlmodel import Field, Relationship, UniqueConstraint

from app.entities.activity import Activity
from app.entities.base import BaseEntity
from app.entities.user import User


class EstadoParticipacion(StrEnum):
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    # Los cupos estaban llenos: espera a que alguien cancele
    EN_ESPERA = "en_espera"
    # La organización canceló la actividad
    CANCELADA = "cancelada"
    # El voluntario se retiró (un aceptado con motivo, hasta 24 horas antes)
    RETIRADA = "retirada"


# Solicitudes que pasan a canceladas cuando la organización cancela la actividad
ESTADOS_QUE_SE_CANCELAN = (
    EstadoParticipacion.PENDIENTE,
    EstadoParticipacion.ACEPTADA,
    EstadoParticipacion.EN_ESPERA,
)


class Participation(BaseEntity, table=True):
    """Solicitud de un voluntario para participar en una actividad."""

    __tablename__ = "participations"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_participation_activity_user"),
    )

    activity_id: UUID = Field(foreign_key="activity.id", index=True, nullable=False)
    user_id: str = Field(index=True, nullable=False)
    # Valores de EstadoParticipacion
    status: str = Field(
        default=EstadoParticipacion.PENDIENTE.value, max_length=20, index=True, nullable=False
    )
    # Estado antes de que la organización cancelara la actividad (historial)
    estado_anterior: str | None = Field(default=None, max_length=20, nullable=True)
    # Por qué se retiró un aceptado; un pendiente o en espera se retira sin motivo
    motivo_retiro: str | None = Field(default=None, max_length=500, nullable=True)

    user: Optional[User] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(Participation.user_id) == User.id",
            "viewonly": True,
            "lazy": "selectin",
        }
    )
    activity: Optional[Activity] = Relationship(sa_relationship_kwargs={"viewonly": True})

    # ── Getters ───────────────────────────────────────────────────────────────
    @property
    def estado(self) -> EstadoParticipacion:
        return EstadoParticipacion(self.status)

    @property
    def user_name(self) -> str:
        return self.user.name if self.user and self.user.name else "Usuario"

    @property
    def user_image(self) -> str | None:
        return self.user.image if self.user else None
