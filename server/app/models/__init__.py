"""
app/models — la M de MVC.

Cada modelo es una tabla (SQLModel) que además guarda sus reglas de negocio
y sus consultas. Este archivo es también el registro de tablas: Alembic y
`init_db()` importan `app.models` para conocerlas todas.
"""

from app.models.activity import Activity, ActivityStatus
from app.models.activity_detail import ActivityDetail
from app.models.base import BaseModel
from app.models.cause import ActivityCause, Cause
from app.models.participation import (
    ESTADOS_QUE_SE_CANCELAN,
    EstadoParticipacion,
    Participation,
)
from app.models.user import User

__all__ = [
    "Activity",
    "ActivityCause",
    "ActivityDetail",
    "ActivityStatus",
    "BaseModel",
    "Cause",
    "ESTADOS_QUE_SE_CANCELAN",
    "EstadoParticipacion",
    "Participation",
    "User",
]
