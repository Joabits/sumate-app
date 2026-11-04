from datetime import datetime

from app.shared.infrastructure.db.base_model import BaseModel
from sqlmodel import Field


class ActivityModel(BaseModel, table=True):
    __tablename__ = "activity"

    name: str = Field(index=True, nullable=False)
    owner_id: str = Field(index=True, nullable=False)
    image_url: str = Field(nullable=False)
    date: datetime = Field(index=True, nullable=False)
    status: str = Field(default="draft", index=True, nullable=False)
    capacity: int = Field(default=1, nullable=False)
    # Solo se llena cuando la organización cancela la actividad
    motivo_cancelacion: str | None = Field(default=None, max_length=500, nullable=True)
