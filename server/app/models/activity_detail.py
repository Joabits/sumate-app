from uuid import UUID

from sqlmodel import Field, Session, select

from app.models.base import BaseModel
from app.models.exceptions import InvalidActivityDetailException

MAX_PLACE = 255
MAX_ADDRESS = 500
MAX_DESCRIPTION = 5000


class ActivityDetail(BaseModel, table=True):
    """Ubicación y descripción de una actividad (una fila por actividad)."""

    __tablename__ = "activity_detail"

    activity_id: UUID = Field(foreign_key="activity.id", unique=True, index=True, nullable=False)
    latitude: float | None = Field(default=None, nullable=True)
    longitude: float | None = Field(default=None, nullable=True)
    place: str | None = Field(default=None, max_length=MAX_PLACE, nullable=True)
    address: str | None = Field(default=None, max_length=MAX_ADDRESS, nullable=True)
    description: str | None = Field(default=None, nullable=True)

    @classmethod
    def create(
        cls,
        *,
        activity_id: UUID,
        latitude: float | None = None,
        longitude: float | None = None,
        place: str | None = None,
        address: str | None = None,
        description: str | None = None,
    ) -> "ActivityDetail":
        latitude, longitude = cls.validate_coordinates(latitude, longitude)
        return cls(
            activity_id=activity_id,
            latitude=latitude,
            longitude=longitude,
            place=cls.validate_place(place),
            address=cls.validate_address(address),
            description=cls.validate_description(description),
        )

    @classmethod
    def of_activity(cls, session: Session, activity_id: UUID) -> "ActivityDetail | None":
        statement = select(cls).where(cls.activity_id == activity_id)
        return session.exec(statement).first()

    # ── Reglas ────────────────────────────────────────────────────────────────
    def update_location(
        self,
        *,
        latitude: float | None,
        longitude: float | None,
        place: str | None = None,
        address: str | None = None,
    ) -> None:
        self.latitude, self.longitude = self.validate_coordinates(latitude, longitude)
        if place is not None:
            self.place = self.validate_place(place)
        if address is not None:
            self.address = self.validate_address(address)

    def update_description(self, description: str | None) -> None:
        self.description = self.validate_description(description)

    @property
    def has_location(self) -> bool:
        return self.latitude is not None and self.longitude is not None

    @staticmethod
    def validate_coordinates(
        latitude: float | None, longitude: float | None
    ) -> tuple[float | None, float | None]:
        if latitude is None and longitude is None:
            return None, None
        if latitude is None or longitude is None:
            raise InvalidActivityDetailException(
                "Tanto la latitud como la longitud deben proporcionarse conjuntamente."
            )
        if not (-90.0 <= latitude <= 90.0):
            raise InvalidActivityDetailException(
                "La latitud debe estar comprendida entre -90.0 y 90.0 grados."
            )
        if not (-180.0 <= longitude <= 180.0):
            raise InvalidActivityDetailException(
                "La longitud debe estar comprendida entre -180.0 y 180.0 grados."
            )
        return float(latitude), float(longitude)

    @staticmethod
    def _clean(value: str | None, maximum: int, message: str) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if len(cleaned) > maximum:
            raise InvalidActivityDetailException(message)
        return cleaned or None

    @classmethod
    def validate_place(cls, place: str | None) -> str | None:
        return cls._clean(place, MAX_PLACE, "El nombre del lugar no puede superar los 255 caracteres.")

    @classmethod
    def validate_address(cls, address: str | None) -> str | None:
        return cls._clean(address, MAX_ADDRESS, "La dirección no puede superar los 500 caracteres.")

    @classmethod
    def validate_description(cls, description: str | None) -> str | None:
        return cls._clean(
            description, MAX_DESCRIPTION, "La descripción no puede superar los 5,000 caracteres."
        )
