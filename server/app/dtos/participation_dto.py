from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlmodel import SQLModel

from app.core.fechas import as_utc
from app.entities.cause import Cause
from app.entities.participation import Participation
from app.dtos.cause_dto import CauseRead, to_causes

BOLIVIA_TZ = ZoneInfo("America/La_Paz")


class ParticipatedActivityItemRead(SQLModel):
    id: UUID
    name: str
    image_url: str
    date: datetime
    owner_id: str
    capacity: int
    status: str
    enrolled_date: datetime
    is_past: bool
    estado_solicitud: str = "aceptada"
    creator_name: str | None = None
    creator_image: str | None = None
    causes: list[CauseRead] = []
    # Si la organización canceló la actividad: su motivo y el estado que tenía la solicitud
    motivo_cancelacion: str | None = None
    estado_anterior: str | None = None


class ParticipatedActivityListRead(SQLModel):
    items: list[ParticipatedActivityItemRead]


# ── Retirarse ─────────────────────────────────────────────────────────────────
class RetiroRequest(SQLModel):
    # Obligatorio solo si la solicitud estaba aceptada; lo valida el service
    motivo: str | None = None


class RetiroRead(SQLModel):
    # pendiente | aceptada | en_espera: lo que era la solicitud antes de retirarse
    estado_anterior: str
    # Si al liberar el cupo entró la primera persona de la lista de espera
    entro_de_lista_de_espera: bool


def to_trayectoria(
    participations: list[Participation],
    causes_by_activity: dict[UUID, list[Cause]],
    now: datetime | None = None,
) -> ParticipatedActivityListRead:
    """Mi trayectoria: primero las próximas (la más cercana arriba), después las pasadas."""
    now_bolivia = (now or datetime.now(BOLIVIA_TZ)).astimezone(BOLIVIA_TZ)

    items: list[ParticipatedActivityItemRead] = []
    for participation in participations:
        activity = participation.activity
        activity_date = as_utc(activity.date)
        items.append(
            ParticipatedActivityItemRead(
                id=activity.id,
                name=activity.name,
                image_url=activity.image_url,
                date=activity_date,
                owner_id=activity.owner_id,
                capacity=activity.capacity,
                status=activity.status,
                enrolled_date=participation.created_date,
                is_past=activity_date.astimezone(BOLIVIA_TZ) < now_bolivia,
                estado_solicitud=participation.status,
                creator_name=activity.creator_name,
                creator_image=activity.creator_image,
                causes=to_causes(causes_by_activity.get(activity.id, [])),
                motivo_cancelacion=activity.motivo_cancelacion,
                estado_anterior=participation.estado_anterior,
            )
        )

    upcoming = sorted((i for i in items if not i.is_past), key=lambda i: i.date)
    past = sorted((i for i in items if i.is_past), key=lambda i: i.date, reverse=True)
    return ParticipatedActivityListRead(items=upcoming + past)
