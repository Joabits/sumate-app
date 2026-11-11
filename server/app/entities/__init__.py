"""
app/entities — las tablas (como las @Entity de Java).

Cada entity tiene solo sus columnas, sus relaciones y getters simples.
Las reglas de negocio están en app/services y las consultas en app/repositories.

Este archivo es también el registro de tablas: Alembic y `init_db()` importan
`app.entities` para conocerlas todas.
"""

from app.entities.activity import Activity, ActivityStatus
from app.entities.activity_detail import ActivityDetail
from app.entities.base import BaseEntity
from app.entities.cause import ActivityCause, Cause
from app.entities.evento import Evento, NombreEvento
from app.entities.participation import (
    ESTADOS_QUE_SE_CANCELAN,
    EstadoParticipacion,
    Participation,
)
from app.entities.registro_horas import EstadoHoras, RegistroHoras
from app.entities.user import User

__all__ = [
    "Activity",
    "ActivityCause",
    "ActivityDetail",
    "ActivityStatus",
    "BaseEntity",
    "Cause",
    "ESTADOS_QUE_SE_CANCELAN",
    "EstadoHoras",
    "EstadoParticipacion",
    "Evento",
    "NombreEvento",
    "Participation",
    "RegistroHoras",
    "User",
]
