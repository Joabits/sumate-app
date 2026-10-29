from datetime import datetime, timezone
from enum import Enum
from typing import Annotated
from uuid import UUID

from fastapi import Form
from sqlmodel import Field, SQLModel

from app.modules.activities.domain.exceptions import InvalidActivityDateException
from app.modules.activities.infrastructure.api.schemas.cause_schemas import (
    CauseListRead,
    CauseRead,
    ReplaceActivityCausesRequest,
)


class TimeOfDayFilter(str, Enum):
    any = "any"
    early_morning = "early_morning"
    morning = "morning"
    afternoon = "afternoon"
    night = "night"


class DatePresetFilter(str, Enum):
    upcoming = "upcoming"
    starting_soon = "starting_soon"
    today = "today"
    tomorrow = "tomorrow"
    this_weekend = "this_weekend"
    next_week = "next_week"
    next_weekend = "next_weekend"


class CapacityRangeFilter(str, Enum):
    any = "any"
    one_to_nine = "1-9"
    ten_to_twenty = "10-20"
    gt_twenty = "gt-20"



class CreateActivityRequest(SQLModel):
    """Petición para registrar una nueva actividad."""

    name: str = Field(description="Nombre de la actividad")
    date: datetime = Field(description="Fecha y hora de realización de la actividad")
    capacity: int = Field(default=1, description="Cantidad de cupos o plazas")

    @classmethod
    def as_form(
        cls,
        name: Annotated[str, Form(description="Nombre de la actividad")],
        date: Annotated[str, Form(description="Fecha y hora de realización de la actividad")],
        capacity: Annotated[int, Form(description="Cantidad de cupos o plazas")] = 1,
    ) -> "CreateActivityRequest":
        clean_date_str = date.strip().replace("Z", "+00:00")
        try:
            parsed_date = datetime.fromisoformat(clean_date_str)
            if parsed_date.tzinfo is None:
                parsed_date = parsed_date.replace(tzinfo=timezone.utc)
        except ValueError:
            raise InvalidActivityDateException("El formato de la fecha es inválido. Use ISO 8601 o YYYY-MM-DDTHH:MM.")

        return cls(
            name=name,
            date=parsed_date,
            capacity=capacity,
        )



class ActivityListItemRead(SQLModel):
    id: UUID
    name: str
    image_url: str
    date: datetime
    owner_id: str
    capacity: int
    status: str
    creator_name: str | None = None
    creator_image: str | None = None
    causes: list[CauseRead] = []
    registered_count: int = 0


class ActivityListRead(SQLModel):
    items: list[ActivityListItemRead]


class MyActivityListItemRead(SQLModel):
    id: UUID
    name: str
    image_url: str
    date: datetime
    owner_id: str
    capacity: int
    status: str
    registered_count: int
    creator_name: str | None = None
    creator_image: str | None = None
    causes: list[CauseRead] = []


class MyActivityListRead(SQLModel):
    items: list[MyActivityListItemRead]


class ActivityDetailDataRead(SQLModel):
    id: UUID
    activity_id: UUID
    latitude: float | None = None
    longitude: float | None = None
    place: str | None = None
    address: str | None = None
    description: str | None = None


class ActivityParticipantRead(SQLModel):
    id: str
    name: str
    image: str | None = None


class ActivityDetailRead(SQLModel):
    id: UUID
    name: str
    owner_id: str
    creator_name: str | None = None
    creator_image: str | None = None
    image_url: str
    date: datetime
    capacity: int
    status: str
    is_owner: bool
    is_participating: bool = False
    # Estado de la solicitud del usuario actual: pendiente | aceptada | rechazada | None
    estado_solicitud: str | None = None
    participants: list[ActivityParticipantRead] = []
    # Solicitudes pendientes; solo se envían al organizador
    solicitudes_pendientes: list[ActivityParticipantRead] = []
    detail: ActivityDetailDataRead | None = None
    causes: list[CauseRead] = []


class UpdateLocationRequest(SQLModel):
    latitude: float
    longitude: float
    place: str | None = None


class UpdateDescriptionRequest(SQLModel):
    description: str


class UpdateActivityInfoRequest(SQLModel):
    name: str | None = None
    date: datetime | None = None


class UpdateActivityCapacityRequest(SQLModel):
    capacity: int

