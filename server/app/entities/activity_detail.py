from uuid import UUID

from sqlmodel import Field

from app.entities.base import BaseEntity

MAX_PLACE = 255
MAX_ADDRESS = 500
MAX_DESCRIPTION = 5000


class ActivityDetail(BaseEntity, table=True):
    """Ubicación y descripción de una actividad (una fila por actividad)."""

    __tablename__ = "activity_detail"

    activity_id: UUID = Field(foreign_key="activity.id", unique=True, index=True, nullable=False)
    latitude: float | None = Field(default=None, nullable=True)
    longitude: float | None = Field(default=None, nullable=True)
    place: str | None = Field(default=None, max_length=MAX_PLACE, nullable=True)
    address: str | None = Field(default=None, max_length=MAX_ADDRESS, nullable=True)
    description: str | None = Field(default=None, nullable=True)

    @property
    def has_location(self) -> bool:
        return self.latitude is not None and self.longitude is not None
