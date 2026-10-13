from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from app.modules.activities.application.queries.list_causes import CauseDTO
from app.modules.activities.application.queries.list_explore_activities import (
    ActivityListDTO,
    ActivityListItemDTO,
)
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)


@dataclass(frozen=True, slots=True)
class SearchActivitiesQuery:
    query: str | None = None
    time_of_day: str | None = None
    date_preset: str | None = None
    capacity_range: str | None = None
    cause_ids: tuple[UUID, ...] = ()
    user_latitude: float | None = None
    user_longitude: float | None = None
    max_distance_km: float | None = None


class SearchActivitiesQueryHandler:
    def __init__(self, activity_repository: ActivityRepository) -> None:
        self.activity_repository = activity_repository

    def execute(self, query: SearchActivitiesQuery) -> ActivityListDTO:
        now = datetime.now(timezone.utc)
        activities = self.activity_repository.search_activities(
            query=query.query,
            time_of_day=query.time_of_day,
            date_preset=query.date_preset,
            capacity_range=query.capacity_range,
            cause_ids=query.cause_ids,
            user_latitude=query.user_latitude,
            user_longitude=query.user_longitude,
            max_distance_km=query.max_distance_km,
            min_date=now,
        )

        activity_ids = [activity.id for activity in activities]
        causes_by_activity = self.activity_repository.get_causes_for_activities(
            activity_ids
        )

        items = tuple(
            ActivityListItemDTO(
                id=activity.id,
                name=activity.name,
                image_url=activity.image_url,
                date=activity.date,
                owner_id=activity.owner_id,
                capacity=activity.capacity,
                status=(
                    activity.status.value
                    if hasattr(activity.status, "value")
                    else str(activity.status)
                ),
                creator_name=activity.creator_name,
                creator_image=activity.creator_image,
                causes=tuple(
                    CauseDTO(id=c.id, name=c.name, slug=c.slug)
                    for c in causes_by_activity.get(activity.id, [])
                ),
            )
            for activity in activities
        )

        return ActivityListDTO(items=items)
