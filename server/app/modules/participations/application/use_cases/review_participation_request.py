from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.entities.participation import Participation
from app.modules.participations.domain.exceptions import (
    ActivityCapacityExceededException,
    CannotJoinPastActivityException,
    NotActivityOrganizerException,
    ParticipationNotFoundException,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork


@dataclass(slots=True)
class ReviewParticipationRequestCommand:
    activity_id: UUID
    participant_id: str
    organizer_id: str


class _ReviewParticipationRequestUseCase:
    """Base común: solo el organizador revisa solicitudes de su actividad."""

    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def _load(self, command: ReviewParticipationRequestCommand):
        # FOR UPDATE sobre la actividad serializa las aceptaciones simultáneas
        activity = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not activity:
            raise ActivityNotFoundException()

        if activity.owner_id != command.organizer_id:
            raise NotActivityOrganizerException()

        participation = self.participation_repository.get_by_activity_and_user(
            command.activity_id, command.participant_id
        )
        if participation is None:
            raise ParticipationNotFoundException()

        return activity, participation


class AcceptParticipationRequestUseCase(_ReviewParticipationRequestUseCase):
    def execute(self, command: ReviewParticipationRequestCommand) -> Participation:
        activity, participation = self._load(command)

        act_date = (
            activity.date
            if activity.date.tzinfo
            else activity.date.replace(tzinfo=timezone.utc)
        )
        if act_date <= datetime.now(timezone.utc):
            raise CannotJoinPastActivityException()

        accepted_count = self.participation_repository.count_by_activity_id(
            command.activity_id
        )
        if accepted_count >= activity.capacity:
            raise ActivityCapacityExceededException()

        participation.accept()
        self.participation_repository.save(participation)
        self.uow.commit()
        return participation


class RejectParticipationRequestUseCase(_ReviewParticipationRequestUseCase):
    def execute(self, command: ReviewParticipationRequestCommand) -> Participation:
        _, participation = self._load(command)

        participation.reject()
        self.participation_repository.save(participation)
        self.uow.commit()
        return participation
