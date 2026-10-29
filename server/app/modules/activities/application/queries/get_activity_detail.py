from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from app.modules.activities.application.queries.list_causes import CauseDTO
from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.entities.participation import ParticipationStatus
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)


@dataclass(frozen=True, slots=True)
class ActivityParticipantDetailDTO:
    id: str
    name: str
    image: str | None = None


@dataclass(frozen=True, slots=True)
class GetActivityDetailQuery:
    activity_id: UUID
    current_user_id: str | None = None


@dataclass(frozen=True, slots=True)
class ActivityDetailDataDTO:
    id: UUID
    activity_id: UUID
    latitude: float | None = None
    longitude: float | None = None
    place: str | None = None
    address: str | None = None
    description: str | None = None


@dataclass(frozen=True, slots=True)
class ActivityDetailDTO:
    id: UUID
    name: str
    owner_id: str
    image_url: str
    date: datetime
    capacity: int
    status: str
    is_owner: bool = False
    creator_name: str | None = None
    creator_image: str | None = None
    is_participating: bool = False
    participation_status: str | None = None
    participants: list[ActivityParticipantDetailDTO] = field(default_factory=list)
    pending_requests: list[ActivityParticipantDetailDTO] = field(default_factory=list)
    detail: ActivityDetailDataDTO | None = None
    causes: tuple[CauseDTO, ...] = ()


class GetActivityDetailQueryHandler:
    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository | None = None,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository

    def execute(self, query: GetActivityDetailQuery) -> ActivityDetailDTO:
        result = self.activity_repository.get_detail_by_activity_id(query.activity_id)
        if not result:
            raise ActivityNotFoundException()

        activity, detail = result
        activity_status = (
            activity.status.value
            if hasattr(activity.status, "value")
            else str(activity.status)
        )

        if activity_status == "draft" and activity.owner_id != query.current_user_id:
            raise ActivityNotFoundException()

        is_owner = bool(query.current_user_id and activity.owner_id == query.current_user_id)

        participation_status: str | None = None
        if self.participation_repository and query.current_user_id:
            own_request = self.participation_repository.get_by_activity_and_user(
                query.activity_id, query.current_user_id
            )
            if own_request is not None:
                participation_status = own_request.status.value
        is_participating = participation_status == ParticipationStatus.ACCEPTED.value

        participants: list[ActivityParticipantDetailDTO] = []
        pending_requests: list[ActivityParticipantDetailDTO] = []
        if self.participation_repository:
            participants = self._list_participants(
                query.activity_id, ParticipationStatus.ACCEPTED
            )
            # Solo el organizador ve quién está esperando respuesta
            if is_owner:
                pending_requests = self._list_participants(
                    query.activity_id, ParticipationStatus.PENDING
                )

        detail_dto = (
            ActivityDetailDataDTO(
                id=detail.id,
                activity_id=detail.activity_id,
                latitude=detail.latitude,
                longitude=detail.longitude,
                place=detail.place,
                address=detail.address,
                description=detail.description,
            )
            if detail
            else None
        )

        causes_entities = self.activity_repository.get_causes_by_activity_id(activity.id)
        causes_dtos = tuple(
            CauseDTO(id=c.id, name=c.name, slug=c.slug)
            for c in causes_entities
        )

        return ActivityDetailDTO(
            id=activity.id,
            name=activity.name,
            owner_id=activity.owner_id,
            image_url=activity.image_url,
            date=activity.date,
            capacity=activity.capacity,
            status=activity_status,
            is_owner=is_owner,
            creator_name=activity.creator_name,
            creator_image=activity.creator_image,
            is_participating=is_participating,
            participation_status=participation_status,
            participants=participants,
            pending_requests=pending_requests,
            detail=detail_dto,
            causes=causes_dtos,
        )

    def _list_participants(
        self, activity_id: UUID, status: ParticipationStatus
    ) -> list[ActivityParticipantDetailDTO]:
        raw_participants = self.participation_repository.list_participants_by_activity_id(
            activity_id, status
        )
        return [
            ActivityParticipantDetailDTO(
                id=part.user_id,
                name=user_name,
                image=user_image,
            )
            for part, user_name, user_image in raw_participants
        ]
