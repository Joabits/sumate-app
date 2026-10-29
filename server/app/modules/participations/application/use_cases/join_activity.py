from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from app.modules.activities.domain.entities.activity import ActivityStatus
from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.entities.participation import (
    Participation,
    ParticipationStatus,
)
from app.modules.participations.domain.exceptions import (
    ActivityCapacityExceededException,
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
    RequestRejectedException,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork


@dataclass(slots=True)
class JoinActivityCommand:
    activity_id: UUID
    user_id: str


class JoinActivityUseCase:
    """El voluntario solicita participar; la solicitud queda pendiente."""

    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def execute(self, command: JoinActivityCommand) -> Participation:
        activity = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not activity:
            raise ActivityNotFoundException()

        if activity.owner_id == command.user_id:
            raise CannotJoinOwnActivityException()

        if activity.status != ActivityStatus.ACTIVE:
            raise CannotJoinInactiveActivityException()

        now = datetime.now(timezone.utc)
        act_date = (
            activity.date
            if activity.date.tzinfo
            else activity.date.replace(tzinfo=timezone.utc)
        )
        if act_date <= now:
            raise CannotJoinPastActivityException()

        existing = self.participation_repository.get_by_activity_and_user(
            command.activity_id, command.user_id
        )
        if existing is not None:
            if existing.status == ParticipationStatus.REJECTED:
                raise RequestRejectedException()
            raise AlreadyParticipatingException()

        current_count = self.participation_repository.count_by_activity_id(
            command.activity_id
        )
        if current_count >= activity.capacity:
            raise ActivityCapacityExceededException()

        participation = Participation.create(
            activity_id=command.activity_id,
            user_id=command.user_id,
        )
        self.participation_repository.save(participation)
        self.uow.commit()
        return participation
