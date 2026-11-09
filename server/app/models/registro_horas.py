"""
Horas de voluntariado por jornada.

La organización registra cuántas horas trabajó cada participante aceptado en
cada jornada de una actividad que ya terminó. El voluntario acepta las horas
o las reclama con un motivo; si la organización las corrige, vuelven a quedar
pendientes hasta que el voluntario las acepte otra vez.

    pendiente ──aceptar──▶ confirmada        (solo estas suman al total y a la constancia)
        │  ▲
  reclamar  corregir
        ▼  │
     reclamada
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import Date
from sqlalchemy.orm import selectinload
from sqlmodel import Field, Relationship, Session, UniqueConstraint, select

from app.models.activity import Activity
from app.models.base import BaseModel, as_utc
from app.models.exceptions import (
    ActividadNoTerminadaException,
    FechaJornadaInvalidaException,
    ForbiddenException,
    HorasInvalidasException,
    HorasYaConfirmadasException,
    JornadaYaRegistradaException,
    MotivoReclamoObligatorioException,
    NoEsParticipanteAceptadoException,
    RegistroHorasNoPendienteException,
    RegistroHorasNotFoundException,
    ValidationException,
)
from app.models.participation import EstadoParticipacion, Participation
from app.models.user import User

ZONA_BOLIVIA = ZoneInfo("America/La_Paz")
MAX_HORAS_JORNADA = 24
MAX_MOTIVO_RECLAMO = 500


class EstadoHoras(StrEnum):
    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    RECLAMADA = "reclamada"


def hoy_en_bolivia() -> date:
    return datetime.now(ZONA_BOLIVIA).date()


def dia_en_bolivia(momento: datetime) -> date:
    return as_utc(momento).astimezone(ZONA_BOLIVIA).date()


class RegistroHoras(BaseModel, table=True):
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

    @property
    def user_name(self) -> str:
        return self.user.name if self.user and self.user.name else "Usuario"

    @property
    def user_image(self) -> str | None:
        return self.user.image if self.user else None

    @property
    def esta_confirmada(self) -> bool:
        return self.estado == EstadoHoras.CONFIRMADA

    # ── La organización registra una jornada ──────────────────────────────────
    @classmethod
    def registrar_jornada(
        cls,
        session: Session,
        activity: Activity,
        organizador_id: str,
        jornada: date,
        horas_por_participante: dict[str, float],
    ) -> list["RegistroHoras"]:
        """Crea un registro pendiente por cada participante aceptado de la lista."""
        activity.ensure_owner(organizador_id, "Solo el organizador puede registrar horas.")
        activity.ensure_not_cancelled()
        if not activity.has_passed():
            raise ActividadNoTerminadaException()
        if not (dia_en_bolivia(activity.date) <= jornada <= hoy_en_bolivia()):
            raise FechaJornadaInvalidaException()
        if not horas_por_participante:
            raise ValidationException("Indica las horas de al menos un participante.")

        aceptados = {
            p.user_id
            for p in Participation.list_by_status(session, activity.id, EstadoParticipacion.ACEPTADA)
        }
        ya_registrados = {
            r.user_id for r in cls.of_activity(session, activity.id) if r.jornada == jornada
        }

        registros = []
        for user_id, horas in horas_por_participante.items():
            if user_id not in aceptados:
                raise NoEsParticipanteAceptadoException()
            if user_id in ya_registrados:
                raise JornadaYaRegistradaException()
            registros.append(
                cls(
                    activity_id=activity.id,
                    user_id=user_id,
                    jornada=jornada,
                    horas=cls.validate_horas(horas),
                    estado=EstadoHoras.PENDIENTE.value,
                )
            )
        return registros

    # ── El voluntario responde ────────────────────────────────────────────────
    def ensure_es_del_voluntario(self, user_id: str) -> None:
        if self.user_id != user_id:
            raise ForbiddenException("Solo el voluntario puede responder sus horas.")

    def aceptar(self, user_id: str) -> None:
        self.ensure_es_del_voluntario(user_id)
        if self.estado != EstadoHoras.PENDIENTE:
            raise RegistroHorasNoPendienteException()
        self.estado = EstadoHoras.CONFIRMADA.value

    def reclamar(self, user_id: str, motivo: str) -> None:
        self.ensure_es_del_voluntario(user_id)
        if self.estado != EstadoHoras.PENDIENTE:
            raise RegistroHorasNoPendienteException()
        motivo_limpio = (motivo or "").strip()
        if not motivo_limpio:
            raise MotivoReclamoObligatorioException()
        if len(motivo_limpio) > MAX_MOTIVO_RECLAMO:
            raise ValidationException(
                f"El motivo no puede superar los {MAX_MOTIVO_RECLAMO} caracteres."
            )
        self.estado = EstadoHoras.RECLAMADA.value
        self.motivo_reclamo = motivo_limpio

    # ── La organización corrige ───────────────────────────────────────────────
    def corregir(self, activity: Activity, organizador_id: str, horas: float) -> None:
        """Nuevas horas: el registro vuelve a pendiente y necesita otra aceptación."""
        activity.ensure_owner(organizador_id, "Solo el organizador puede corregir las horas.")
        if self.esta_confirmada:
            raise HorasYaConfirmadasException()
        self.horas_anteriores = self.horas
        self.horas = self.validate_horas(horas)
        self.estado = EstadoHoras.PENDIENTE.value

    @staticmethod
    def validate_horas(horas: float) -> float:
        if isinstance(horas, bool) or not isinstance(horas, (int, float)):
            raise HorasInvalidasException()
        if not (0 < horas <= MAX_HORAS_JORNADA):
            raise HorasInvalidasException()
        return round(float(horas), 2)

    # ── Consultas ─────────────────────────────────────────────────────────────
    @classmethod
    def get_or_404(cls, session: Session, registro_id: UUID) -> "RegistroHoras":
        statement = select(cls).where(cls.id == registro_id, cls.deleted_date.is_(None))
        registro = session.exec(statement).first()
        if registro is None:
            raise RegistroHorasNotFoundException()
        return registro

    @classmethod
    def of_activity(
        cls, session: Session, activity_id: UUID, user_id: str | None = None
    ) -> list["RegistroHoras"]:
        """Registros de la actividad (o solo los de un voluntario), por jornada."""
        statement = select(cls).where(cls.activity_id == activity_id, cls.deleted_date.is_(None))
        if user_id is not None:
            statement = statement.where(cls.user_id == user_id)
        statement = statement.order_by(cls.jornada.asc(), cls.created_date.asc())
        return list(session.exec(statement).all())

    @classmethod
    def confirmadas_del_voluntario(cls, session: Session, user_id: str) -> list["RegistroHoras"]:
        """Solo horas confirmadas: lo que va a la constancia."""
        statement = (
            select(cls)
            .join(Activity, cls.activity_id == Activity.id)
            .where(
                cls.user_id == user_id,
                cls.estado == EstadoHoras.CONFIRMADA.value,
                cls.deleted_date.is_(None),
                Activity.deleted_date.is_(None),
            )
            .order_by(Activity.date.asc(), cls.jornada.asc())
            .options(selectinload(cls.activity))
        )
        return list(session.exec(statement).all())

    @staticmethod
    def total_confirmado(registros: list["RegistroHoras"]) -> float:
        return round(sum(r.horas for r in registros if r.esta_confirmada), 2)

