"""
Evento de analítica de interacción.

Se registra la acción, no a la persona: la tabla no tiene usuario, correo,
nombre ni la actividad. Las propiedades permitidas de cada evento se
validan en app/services/analitica_service.py.
"""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime
from sqlmodel import Field, SQLModel

from app.core.fechas import utc_now


class NombreEvento(StrEnum):
    # Abrió la confirmación para postular a una actividad
    POSTULACION_INICIADA = "postulacion_iniciada"
    # La solicitud quedó guardada (pendiente o en la lista de espera)
    POSTULACION_ENVIADA = "postulacion_enviada"


class Evento(SQLModel, table=True):
    __tablename__ = "eventos"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    evento: str = Field(max_length=60, index=True)
    props: dict[str, Any] = Field(default_factory=dict, sa_type=JSON, nullable=False)
    # La pone el servidor al guardar, no el reloj del celular
    fecha: datetime = Field(
        default_factory=utc_now,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )
