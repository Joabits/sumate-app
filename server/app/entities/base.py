import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.fechas import utc_now


class BaseEntity(SQLModel):
    """Columnas comunes de todas las tablas propias: id, fechas y borrado lógico."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    created_date: datetime = Field(
        default_factory=utc_now,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
    modified_date: datetime = Field(
        default_factory=utc_now,
        sa_type=DateTime(timezone=True),
        nullable=False,
        sa_column_kwargs={"onupdate": utc_now},
    )
    deleted_date: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        nullable=True,
    )
