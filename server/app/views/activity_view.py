from datetime import datetime, timezone
from enum import Enum
from typing import Annotated
from uuid import UUID

from fastapi import Form
from sqlmodel import Field, SQLModel

from app.models.activity import Activity
from app.models.activity_detail import ActivityDetail
from app.models.cause import Cause
from app.models.exceptions import InvalidActivityDateException
from app.models.participation import Participation
from app.views.cause_view import CauseRead, render_causes


# ══════════════════════════════════════════════════════════════════════════════
# ENTRADA
# ══════════════════════════════════════════════════════════════════════════════
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
    """Petición para registrar una nueva actividad (llega como formulario con la imagen)."""

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
            raise InvalidActivityDateException(
                "El formato de la fecha es inválido. Use ISO 8601 o YYYY-MM-DDTHH:MM."
            )
        return cls(name=name, date=parsed_date, capacity=capacity)


class CancelarActividadRequest(SQLModel):
    motivo: str


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


# ══════════════════════════════════════════════════════════════════════════════
# SALIDA
# ══════════════════════════════════════════════════════════════════════════════
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
    # Solo en postulantes cancelados: el estado que tenían antes de la cancelación
    estado_anterior: str | None = None


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
    # Estado de la solicitud del usuario actual: pendiente | aceptada | rechazada | en_espera | cancelada | None
    estado_solicitud: str | None = None
    participants: list[ActivityParticipantRead] = []
    # Solicitudes pendientes; solo se envían al organizador
    solicitudes_pendientes: list[ActivityParticipantRead] = []
    # Puesto del usuario actual en la lista de espera (1 = el próximo en entrar)
    posicion_en_espera: int | None = None
    # Lista de espera en orden de llegada; solo se envía al organizador
    lista_de_espera: list[ActivityParticipantRead] = []
    # Motivo con el que la organización canceló la actividad
    motivo_cancelacion: str | None = None
    # Postulantes afectados por la cancelación, con su estado anterior; solo al organizador
    postulantes_cancelados: list[ActivityParticipantRead] = []
    detail: ActivityDetailDataRead | None = None
    causes: list[CauseRead] = []


# ── Funciones que arman cada respuesta ────────────────────────────────────────
def render_activity_list(
    activities: list[Activity],
    causes_by_activity: dict[UUID, list[Cause]],
    registered_by_activity: dict[UUID, int],
) -> ActivityListRead:
    return ActivityListRead(
        items=[
            ActivityListItemRead(
                id=activity.id,
                name=activity.name,
                image_url=activity.image_url,
                date=activity.date,
                owner_id=activity.owner_id,
                capacity=activity.capacity,
                status=activity.status,
                creator_name=activity.creator_name,
                creator_image=activity.creator_image,
                causes=render_causes(causes_by_activity.get(activity.id, [])),
                registered_count=registered_by_activity.get(activity.id, 0),
            )
            for activity in activities
        ]
    )


def render_my_activities(
    activities: list[Activity],
    causes_by_activity: dict[UUID, list[Cause]],
    registered_by_activity: dict[UUID, int],
) -> MyActivityListRead:
    return MyActivityListRead(
        items=[
            MyActivityListItemRead(
                id=activity.id,
                name=activity.name,
                image_url=activity.image_url,
                date=activity.date,
                owner_id=activity.owner_id,
                capacity=activity.capacity,
                status=activity.status,
                registered_count=registered_by_activity.get(activity.id, 0),
                creator_name=activity.creator_name,
                creator_image=activity.creator_image,
                causes=render_causes(causes_by_activity.get(activity.id, [])),
            )
            for activity in activities
        ]
    )


def render_participant(participation: Participation) -> ActivityParticipantRead:
    return ActivityParticipantRead(
        id=participation.user_id,
        name=participation.user_name,
        image=participation.user_image,
        estado_anterior=participation.estado_anterior,
    )


def render_participants(participations: list[Participation]) -> list[ActivityParticipantRead]:
    return [render_participant(p) for p in participations]


def render_detail_data(detail: ActivityDetail | None) -> ActivityDetailDataRead | None:
    if detail is None:
        return None
    return ActivityDetailDataRead(
        id=detail.id,
        activity_id=detail.activity_id,
        latitude=detail.latitude,
        longitude=detail.longitude,
        place=detail.place,
        address=detail.address,
        description=detail.description,
    )


def render_activity_detail(
    activity: Activity,
    *,
    detail: ActivityDetail | None,
    causes: list[Cause],
    is_owner: bool,
    estado_solicitud: str | None,
    is_participating: bool,
    participants: list[Participation],
    solicitudes_pendientes: list[Participation],
    posicion_en_espera: int | None,
    lista_de_espera: list[Participation],
    postulantes_cancelados: list[Participation],
) -> ActivityDetailRead:
    return ActivityDetailRead(
        id=activity.id,
        name=activity.name,
        owner_id=activity.owner_id,
        creator_name=activity.creator_name,
        creator_image=activity.creator_image,
        image_url=activity.image_url,
        date=activity.date,
        capacity=activity.capacity,
        status=activity.status,
        is_owner=is_owner,
        is_participating=is_participating,
        estado_solicitud=estado_solicitud,
        participants=render_participants(participants),
        solicitudes_pendientes=render_participants(solicitudes_pendientes),
        posicion_en_espera=posicion_en_espera,
        lista_de_espera=render_participants(lista_de_espera),
        motivo_cancelacion=activity.motivo_cancelacion,
        postulantes_cancelados=render_participants(postulantes_cancelados),
        detail=render_detail_data(detail),
        causes=render_causes(causes),
    )
