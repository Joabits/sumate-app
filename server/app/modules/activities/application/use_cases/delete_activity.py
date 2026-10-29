from dataclasses import dataclass
from uuid import UUID

from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork
from app.shared.domain.exceptions import ForbiddenException, ValidationException


@dataclass(slots=True)
class DeleteActivityCommand:
    activity_id: UUID
    owner_id: str


class DeleteActivityUseCase:
    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def execute(self, command: DeleteActivityCommand) -> str:
        """Elimina la actividad y retorna la URL de su imagen para poder borrarla."""
        activity = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not activity:
            raise ActivityNotFoundException()

        if activity.owner_id != command.owner_id:
            raise ForbiddenException("Solo el organizador puede eliminar la actividad.")

        participants = self.participation_repository.list_participants_by_activity_id(
            command.activity_id
        )
        if len(participants) > 0:
            raise ValidationException(
                "No se puede eliminar una actividad que ya cuenta con participantes inscritos."
            )

        self.participation_repository.delete_unconfirmed_by_activity_id(command.activity_id)
        self.activity_repository.delete(activity)
        self.uow.commit()
        return activity.image_url
