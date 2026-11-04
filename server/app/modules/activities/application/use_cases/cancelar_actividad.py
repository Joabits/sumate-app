from dataclasses import dataclass
from uuid import UUID

from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.entities.participation import Participation
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork
from app.shared.domain.exceptions import ForbiddenException


@dataclass(slots=True)
class CancelarActividadCommand:
    activity_id: UUID
    organizador_id: str
    motivo: str


class CancelarActividadUseCase:
    """La organización cancela una actividad publicada con un motivo obligatorio.

    Las solicitudes pendientes, aceptadas y en lista de espera pasan a canceladas
    y cada una guarda el estado que tenía, así queda en el historial del voluntario.
    """

    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def execute(self, command: CancelarActividadCommand) -> list[Participation]:
        # FOR UPDATE: nadie acepta ni se une mientras se cancela
        actividad = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not actividad:
            raise ActivityNotFoundException()

        if actividad.owner_id != command.organizador_id:
            raise ForbiddenException("Solo el organizador puede cancelar la actividad.")

        actividad.cancelar(command.motivo)

        afectadas = self.participation_repository.listar_postulantes(actividad.id)
        for solicitud in afectadas:
            solicitud.cancelar_por_organizacion()
            self.participation_repository.save(solicitud)

        self.activity_repository.save(actividad)
        self.uow.commit()
        return afectadas
