from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlmodel import Field, Relationship, Session, select

from app.models.activity_detail import ActivityDetail
from app.models.base import BaseModel, already_passed, utc_now
from app.models.cause import ActivityCause
from app.models.exceptions import (
    ActividadCanceladaException,
    ActivityNotFoundException,
    CapacityLessThanRegisteredException,
    ForbiddenException,
    InvalidActivityCapacityException,
    InvalidActivityDateException,
    InvalidActivityImageException,
    InvalidActivityNameException,
    MotivoCancelacionObligatorioException,
    ValidationException,
)
from app.models.user import User

if TYPE_CHECKING:
    from app.models.cause import Cause

MAX_MOTIVO_CANCELACION = 500
MAX_CAPACITY = 10000


class ActivityStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    # La organización la canceló con un motivo; ya no admite cambios
    CANCELLED = "cancelled"


class Activity(BaseModel, table=True):
    """Actividad o convocatoria comunitaria que publica una organización."""

    __tablename__ = "activity"

    name: str = Field(index=True, nullable=False)
    owner_id: str = Field(index=True, nullable=False)
    image_url: str = Field(nullable=False)
    date: datetime = Field(index=True, nullable=False)
    status: str = Field(default=ActivityStatus.DRAFT.value, index=True, nullable=False)
    capacity: int = Field(default=1, nullable=False)
    # Solo se llena cuando la organización cancela la actividad
    motivo_cancelacion: str | None = Field(default=None, max_length=500, nullable=True)

    # Organizador (tabla de Better Auth, sin clave foránea en la base)
    owner: Optional[User] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(Activity.owner_id) == User.id",
            "viewonly": True,
            "lazy": "selectin",
        }
    )

    @property
    def creator_name(self) -> str | None:
        return self.owner.name if self.owner else None

    @property
    def creator_image(self) -> str | None:
        return self.owner.image if self.owner else None

    # ── Creación ──────────────────────────────────────────────────────────────
    @classmethod
    def create(
        cls,
        *,
        name: str,
        owner_id: str,
        image_url: str,
        date: datetime,
        capacity: int = 1,
    ) -> "Activity":
        """Nueva actividad en borrador. La fecha tiene que ser futura."""
        cls.ensure_future_date(cls.validate_date(date))
        return cls(
            name=cls.normalize_name(name),
            owner_id=cls.validate_owner_id(owner_id),
            image_url=cls.validate_image_url(image_url),
            date=date,
            capacity=cls.validate_capacity(capacity),
            status=ActivityStatus.DRAFT.value,
        )

    # ── Consultas ─────────────────────────────────────────────────────────────
    @classmethod
    def get(
        cls, session: Session, activity_id: UUID, *, for_update: bool = False
    ) -> "Activity | None":
        statement = select(cls).where(cls.id == activity_id, cls.deleted_date.is_(None))
        if for_update:
            # Bloquea la fila para que dos peticiones no tomen el mismo cupo a la vez
            statement = statement.with_for_update(of=cls)
        return session.exec(statement).first()

    @classmethod
    def get_or_404(
        cls, session: Session, activity_id: UUID, *, for_update: bool = False
    ) -> "Activity":
        activity = cls.get(session, activity_id, for_update=for_update)
        if activity is None:
            raise ActivityNotFoundException()
        return activity

    @classmethod
    def list_explore(
        cls, session: Session, *, exclude_owner_id: str, min_date: datetime
    ) -> list["Activity"]:
        statement = (
            select(cls)
            .where(
                cls.deleted_date.is_(None),
                cls.owner_id != exclude_owner_id,
                cls.status == ActivityStatus.ACTIVE.value,
                cls.date >= min_date,
            )
            .order_by(cls.date.asc())
        )
        return list(session.exec(statement).all())

    @classmethod
    def list_by_owner(cls, session: Session, owner_id: str) -> list["Activity"]:
        statement = (
            select(cls)
            .where(cls.owner_id == owner_id, cls.deleted_date.is_(None))
            .order_by(cls.created_date.desc())
        )
        return list(session.exec(statement).all())

    # ── Reglas de negocio ─────────────────────────────────────────────────────
    @property
    def is_draft(self) -> bool:
        return self.status == ActivityStatus.DRAFT

    @property
    def is_active(self) -> bool:
        return self.status == ActivityStatus.ACTIVE

    @property
    def is_cancelled(self) -> bool:
        return self.status == ActivityStatus.CANCELLED

    def is_owner(self, user_id: str | None) -> bool:
        return bool(user_id) and self.owner_id == user_id

    def ensure_owner(self, user_id: str, message: str) -> None:
        if not self.is_owner(user_id):
            raise ForbiddenException(message)

    def ensure_not_cancelled(self) -> None:
        if self.is_cancelled:
            raise ActividadCanceladaException()

    def has_passed(self, now: datetime | None = None) -> bool:
        return already_passed(self.date, now)

    def update_info(self, *, name: str | None = None, date: datetime | None = None) -> None:
        if name is not None:
            self.name = self.normalize_name(name)
        if date is not None:
            self.ensure_future_date(self.validate_date(date))
            self.date = date

    def update_capacity(self, capacity: int, registered_count: int = 0) -> None:
        if capacity < registered_count:
            raise CapacityLessThanRegisteredException(registered_count)
        self.capacity = self.validate_capacity(capacity)

    def update_image(self, image_url: str) -> str:
        """Cambia la portada y devuelve la URL anterior para poder borrarla."""
        previous = self.image_url
        self.image_url = self.validate_image_url(image_url)
        return previous

    def missing_requirements(
        self,
        detail: ActivityDetail | None,
        causes: list["Cause"],
        now: datetime | None = None,
    ) -> list[str]:
        """Lo que le falta a la actividad para poder publicarse."""
        missing: list[str] = []
        if not self.name or not self.name.strip():
            missing.append("título")
        if self.has_passed(now):
            missing.append("fecha futura válida")
        if not self.image_url or not self.image_url.strip():
            missing.append("foto de portada")
        if not self.capacity or self.capacity <= 0:
            missing.append("cupos disponibles")
        if detail is None or not detail.has_location:
            missing.append("ubicación en el mapa")
        if detail is None or not detail.description or not detail.description.strip():
            missing.append("descripción")
        if not causes:
            missing.append("al menos una causa temática")
        return missing

    def publish(
        self,
        detail: ActivityDetail | None,
        causes: list["Cause"],
        now: datetime | None = None,
    ) -> None:
        self.ensure_not_cancelled()
        missing = self.missing_requirements(detail, causes, now)
        if missing:
            raise ValidationException(
                "No se puede publicar la actividad. Faltan completar los siguientes "
                f"requisitos: {', '.join(missing)}."
            )
        self.status = ActivityStatus.ACTIVE.value

    def close(self) -> None:
        self.ensure_not_cancelled()
        self.status = ActivityStatus.CLOSED.value

    def reopen(self, now: datetime | None = None) -> None:
        if self.status != ActivityStatus.CLOSED:
            raise ValidationException("Solo se pueden reabrir actividades cerradas.")
        if self.has_passed(now):
            raise ValidationException(
                "No se puede reabrir una actividad cuya fecha ya ha transcurrido."
            )
        self.status = ActivityStatus.ACTIVE.value

    def cancelar(self, motivo: str, now: datetime | None = None) -> None:
        """La organización cancela una oportunidad publicada. El motivo es obligatorio."""
        self.ensure_not_cancelled()
        if self.is_draft:
            raise ValidationException(
                "Un borrador no se cancela porque nadie lo ve; puedes eliminarlo."
            )
        if self.has_passed(now):
            raise ValidationException("No se puede cancelar una actividad que ya pasó.")

        motivo_limpio = (motivo or "").strip()
        if not motivo_limpio:
            raise MotivoCancelacionObligatorioException()
        if len(motivo_limpio) > MAX_MOTIVO_CANCELACION:
            raise ValidationException(
                f"El motivo no puede superar los {MAX_MOTIVO_CANCELACION} caracteres."
            )

        self.status = ActivityStatus.CANCELLED.value
        self.motivo_cancelacion = motivo_limpio

    def ensure_can_be_deleted(self, registered_count: int) -> None:
        # Se conserva para que cada voluntario vea el motivo en su historial
        if self.is_cancelled:
            raise ActividadCanceladaException(
                "Una actividad cancelada no se elimina: los voluntarios ven el motivo en su historial."
            )
        if registered_count > 0:
            raise ValidationException(
                "No se puede eliminar una actividad que ya cuenta con participantes inscritos."
            )

    def delete_with_relations(self, session: Session) -> None:
        """Borra la actividad con sus causas y su detalle."""
        ActivityCause.remove_from_activity(session, self.id)
        detail = ActivityDetail.of_activity(session, self.id)
        if detail is not None:
            session.delete(detail)
        session.flush()
        session.delete(self)

    # ── Validaciones ──────────────────────────────────────────────────────────
    @staticmethod
    def normalize_name(name: str) -> str:
        if not isinstance(name, str) or not name.strip():
            raise InvalidActivityNameException("El nombre de la actividad no puede estar vacío.")
        return name.strip()

    @staticmethod
    def validate_owner_id(owner_id: str) -> str:
        if not isinstance(owner_id, str) or not owner_id.strip():
            raise ValueError("El identificador del creador (owner_id) es obligatorio.")
        return owner_id.strip()

    @staticmethod
    def validate_image_url(image_url: str) -> str:
        if not isinstance(image_url, str) or not image_url.strip():
            raise InvalidActivityImageException("La URL de la imagen de la actividad es requerida.")
        return image_url.strip()

    @staticmethod
    def validate_date(date: datetime) -> datetime:
        if not isinstance(date, datetime):
            raise InvalidActivityDateException(
                "La fecha de la actividad debe ser un objeto datetime válido."
            )
        return date

    @staticmethod
    def ensure_future_date(date: datetime, now: datetime | None = None) -> None:
        """Al crear o reprogramar, la fecha no puede ser anterior a la actual."""
        if already_passed(date, now or utc_now()):
            raise InvalidActivityDateException(
                "La fecha de la actividad debe ser posterior a la fecha actual."
            )

    @staticmethod
    def validate_capacity(capacity: int) -> int:
        if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity <= 0:
            raise InvalidActivityCapacityException(
                "La cantidad de plazas debe ser un número entero mayor a cero."
            )
        if capacity > MAX_CAPACITY:
            raise InvalidActivityCapacityException(
                "La cantidad de plazas no puede superar 10,000."
            )
        return capacity
