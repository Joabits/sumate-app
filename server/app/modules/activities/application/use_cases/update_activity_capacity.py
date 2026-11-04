from dataclasses import dataclass
from uuid import UUID

from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.domain.exceptions import (
    ActivityNotFoundException,
    CapacityLessThanRegisteredException,
)
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.application.use_cases.lista_de_espera import (
    llenar_cupos_desde_lista_de_espera,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork
from app.shared.domain.exceptions import ForbiddenException


@dataclass(slots=True)
class UpdateActivityCapacityCommand:
    activity_id: UUID
    owner_id: str
    capacity: int


class UpdateActivityCapacityUseCase:
    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def execute(self, command: UpdateActivityCapacityCommand) -> Activity:
        activity = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not activity:
            raise ActivityNotFoundException()

        if activity.owner_id != command.owner_id:
            raise ForbiddenException("Solo el organizador puede editar los cupos de la actividad.")

        registered_count = self.participation_repository.count_by_activity_id(
            command.activity_id
        )
        if command.capacity < registered_count:
            raise CapacityLessThanRegisteredException(registered_count)

        activity.update_capacity(command.capacity)
        self.activity_repository.save(activity)
        # Si hay cupos nuevos, entran los primeros de la lista de espera
        llenar_cupos_desde_lista_de_espera(activity, self.participation_repository)
        self.uow.commit()
        return activity
