from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4

from app.modules.activities.domain.exceptions import (
    InvalidActivityCapacityException,
    InvalidActivityDateException,
    InvalidActivityImageException,
    InvalidActivityNameException,
)
from app.shared.domain.exceptions import ValidationException


class ActivityStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


class Activity:
    """Entidad central de una actividad o iniciativa comunitaria."""

    def __init__(
        self,
        id: UUID,
        name: str,
        owner_id: str,
        image_url: str,
        date: datetime,
        capacity: int = 1,
        status: ActivityStatus | str = ActivityStatus.DRAFT,
        creator_name: str | None = None,
        creator_image: str | None = None,
    ) -> None:
        self.id = id
        self.name = self.normalize_name(name)
        self.owner_id = self.validate_owner_id(owner_id)
        self.image_url = self.validate_image_url(image_url)
        self.date = self.validate_date(date)
        self.capacity = self.validate_capacity(capacity)
        self.status = ActivityStatus(status) if isinstance(status, str) else status
        self.creator_name = creator_name
        self.creator_image = creator_image

    @classmethod
    def create(
        cls,
        *,
        name: str,
        owner_id: str,
        image_url: str,
        date: datetime,
        capacity: int = 1,
        status: ActivityStatus | str = ActivityStatus.DRAFT,
        creator_name: str | None = None,
        creator_image: str | None = None,
    ) -> "Activity":
        return cls(
            id=uuid4(),
            name=name,
            owner_id=owner_id,
            image_url=image_url,
            date=date,
            capacity=capacity,
            status=status,
            creator_name=creator_name,
            creator_image=creator_image,
        )

    def update_info(
        self,
        *,
        name: str | None = None,
        date: datetime | None = None,
    ) -> None:
        if name is not None:
            self.name = self.normalize_name(name)
        if date is not None:
            self.date = self.validate_date(date)

    def update_capacity(self, capacity: int) -> None:
        self.capacity = self.validate_capacity(capacity)

    def update_image(self, image_url: str) -> None:
        self.image_url = self.validate_image_url(image_url)

    def publish(self) -> None:
        if self.status == ActivityStatus.ACTIVE:
            return
        self.status = ActivityStatus.ACTIVE

    def close(self) -> None:
        self.status = ActivityStatus.CLOSED

    def reopen(self, now: datetime | None = None) -> None:
        if self.status != ActivityStatus.CLOSED:
            raise ValidationException("Solo se pueden reabrir actividades cerradas.")
        current_time = now or datetime.now(timezone.utc)
        activity_date = self.date if self.date.tzinfo is not None else self.date.replace(tzinfo=timezone.utc)
        if activity_date <= current_time:
            raise ValidationException("No se puede reabrir una actividad cuya fecha ya ha transcurrido.")
        self.status = ActivityStatus.ACTIVE

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
            raise InvalidActivityDateException("La fecha de la actividad debe ser un objeto datetime válido.")
        return date

    @staticmethod
    def ensure_future_date(date: datetime, now: datetime | None = None) -> None:
        """Al crear o reprogramar, la fecha no puede ser anterior a la actual."""
        current_time = now or datetime.now(timezone.utc)
        activity_date = date if date.tzinfo is not None else date.replace(tzinfo=timezone.utc)
        if activity_date <= current_time:
            raise InvalidActivityDateException("La fecha de la actividad debe ser posterior a la fecha actual.")

    @staticmethod
    def validate_capacity(capacity: int) -> int:
        if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity <= 0:
            raise InvalidActivityCapacityException("La cantidad de plazas debe ser un número entero mayor a cero.")
        if capacity > 10000:
            raise InvalidActivityCapacityException("La cantidad de plazas no puede superar 10,000.")
        return capacity
