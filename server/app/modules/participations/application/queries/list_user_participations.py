from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from app.modules.activities.application.queries.list_causes import CauseDTO
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)


@dataclass(frozen=True, slots=True)
class ParticipatedActivityListItemDTO:
    id: UUID
    name: str
    image_url: str
    date: datetime
    owner_id: str
    capacity: int
    status: str
    enrolled_date: datetime
    is_past: bool
    creator_name: str | None = None
    creator_image: str | None = None
    causes: tuple[CauseDTO, ...] = ()


@dataclass(frozen=True, slots=True)
class ListUserParticipationsQuery:
    user_id: str


@dataclass(frozen=True, slots=True)
class UserParticipationsDTO:
    items: list[ParticipatedActivityListItemDTO]


class ListUserParticipationsQueryHandler:
    def __init__(
        self,
        participation_repository: ParticipationRepository,
        activity_repository: ActivityRepository | None = None,
    ) -> None:
        self.participation_repository = participation_repository
        self.activity_repository = activity_repository

    def execute(self, query: ListUserParticipationsQuery) -> UserParticipationsDTO:
        raw_items = self.participation_repository.list_user_participated_activities(
            query.user_id
        )
        bolivia_tz = ZoneInfo("America/La_Paz")
        now_bolivia = datetime.now(bolivia_tz)

        activity_ids = [act.id for _, act, _, _, _ in raw_items]
        causes_by_activity = (
            self.activity_repository.get_causes_for_activities(activity_ids)
            if self.activity_repository and activity_ids
            else {}
        )

        items: list[ParticipatedActivityListItemDTO] = []
        for part, act, enrolled_date, creator_name, creator_image in raw_items:
            act_date = act.date if act.date.tzinfo else act.date.replace(tzinfo=timezone.utc)
            act_date_bolivia = act_date.astimezone(bolivia_tz)
            is_past = act_date_bolivia < now_bolivia
            causes_dtos = tuple(
                CauseDTO(id=c.id, name=c.name, slug=c.slug)
                for c in causes_by_activity.get(act.id, [])
            )
            items.append(
                ParticipatedActivityListItemDTO(
                    id=act.id,
                    name=act.name,
                    image_url=act.image_url,
                    date=act_date,
                    owner_id=act.owner_id,
                    capacity=act.capacity,
                    status=act.status.value if hasattr(act.status, "value") else str(act.status),
                    enrolled_date=enrolled_date,
                    is_past=is_past,
                    creator_name=creator_name,
                    creator_image=creator_image,
                    causes=causes_dtos,
                )
            )

        upcoming = sorted([item for item in items if not item.is_past], key=lambda x: x.date)
        past = sorted([item for item in items if item.is_past], key=lambda x: x.date, reverse=True)
        return UserParticipationsDTO(items=upcoming + past)
