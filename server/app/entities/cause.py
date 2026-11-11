from uuid import UUID

from sqlmodel import Field, UniqueConstraint

from app.entities.base import BaseEntity


class Cause(BaseEntity, table=True):
    """Causa temática del catálogo (Salud, Animales, Educación...)."""

    __tablename__ = "causes"

    name: str = Field(unique=True, index=True, nullable=False)
    slug: str = Field(unique=True, index=True, nullable=False)


class ActivityCause(BaseEntity, table=True):
    """Relación entre una actividad y sus causas."""

    __tablename__ = "activity_causes"
    __table_args__ = (
        UniqueConstraint("activity_id", "cause_id", name="uq_activity_causes_activity_cause"),
    )

    activity_id: UUID = Field(foreign_key="activity.id", index=True, nullable=False)
    cause_id: UUID = Field(foreign_key="causes.id", index=True, nullable=False)
