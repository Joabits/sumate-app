from datetime import datetime
from enum import StrEnum
from typing import Optional

from sqlmodel import Field, Relationship

from app.core.fechas import already_passed
from app.entities.base import BaseEntity
from app.entities.user import User


class ActivityStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    # La organización la canceló con un motivo; ya no admite cambios
    CANCELLED = "cancelled"


class Activity(BaseEntity, table=True):
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

    # ── Getters ───────────────────────────────────────────────────────────────
    @property
    def creator_name(self) -> str | None:
        return self.owner.name if self.owner else None

    @property
    def creator_image(self) -> str | None:
        return self.owner.image if self.owner else None

    @property
    def is_draft(self) -> bool:
        return self.status == ActivityStatus.DRAFT

    @property
    def is_active(self) -> bool:
        return self.status == ActivityStatus.ACTIVE

    @property
    def is_closed(self) -> bool:
        return self.status == ActivityStatus.CLOSED

    @property
    def is_cancelled(self) -> bool:
        return self.status == ActivityStatus.CANCELLED

    def is_owner(self, user_id: str | None) -> bool:
        return bool(user_id) and self.owner_id == user_id

    def has_passed(self, now: datetime | None = None) -> bool:
        return already_passed(self.date, now)
