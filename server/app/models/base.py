import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """Las fechas sin zona horaria se guardan en UTC."""
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def already_passed(value: datetime, now: datetime | None = None) -> bool:
    return as_utc(value) <= (now or utc_now())


class BaseModel(SQLModel):
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

    def soft_delete(self) -> None:
        now = utc_now()
        self.deleted_date = now
        self.modified_date = now

    def restore(self) -> None:
        self.deleted_date = None
        self.modified_date = utc_now()
