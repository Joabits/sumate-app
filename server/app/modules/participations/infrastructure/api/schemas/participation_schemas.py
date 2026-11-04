from datetime import datetime
from uuid import UUID

from app.modules.activities.infrastructure.api.schemas.cause_schemas import CauseRead
from sqlmodel import SQLModel


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
