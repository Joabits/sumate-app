"""Verificaciones sobre una actividad que comparten varios services."""

from uuid import UUID

from app.entities.activity import Activity
from app.exceptions import (
    ActividadCanceladaException,
    ActivityNotFoundException,
    ForbiddenException,
)
from app.repositories.activity_repository import ActivityRepository


def get_activity_or_404(
    activities: ActivityRepository, activity_id: UUID, *, for_update: bool = False
) -> Activity:
    activity = activities.find_by_id(activity_id, for_update=for_update)
    if activity is None:
        raise ActivityNotFoundException()
    return activity


def ensure_owner(activity: Activity, user_id: str, message: str) -> None:
    if not activity.is_owner(user_id):
        raise ForbiddenException(message)


def ensure_not_cancelled(activity: Activity) -> None:
    if activity.is_cancelled:
        raise ActividadCanceladaException()
