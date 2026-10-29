from uuid import UUID

from app.shared.infrastructure.db.base_model import BaseModel
from sqlmodel import Field, UniqueConstraint


class ParticipationModel(BaseModel, table=True):
    __tablename__ = "participations"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_participation_activity_user"),
    )

    activity_id: UUID = Field(foreign_key="activity.id", index=True, nullable=False)
    user_id: str = Field(index=True, nullable=False)
    # pendiente → solicitud enviada; aceptada / rechazada → decisión del organizador
    status: str = Field(default="pendiente", max_length=20, index=True, nullable=False)
