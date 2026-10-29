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
    NoEsOrganizadorException,
    ParticipationNotFoundException,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork


@dataclass(slots=True)
class RevisarSolicitudCommand:
    activity_id: UUID
    participante_id: str
    organizador_id: str


class _RevisarSolicitudUseCase:
    """Base común: solo el organizador revisa las solicitudes de su actividad."""

    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def _cargar(self, command: RevisarSolicitudCommand):
        # FOR UPDATE sobre la actividad serializa las aceptaciones simultáneas
        actividad = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not actividad:
            raise ActivityNotFoundException()

        if actividad.owner_id != command.organizador_id:
            raise NoEsOrganizadorException()

        solicitud = self.participation_repository.get_by_activity_and_user(
            command.activity_id, command.participante_id
        )
        if solicitud is None:
            raise ParticipationNotFoundException()

        return actividad, solicitud


class AceptarSolicitudUseCase(_RevisarSolicitudUseCase):
    def execute(self, command: RevisarSolicitudCommand) -> Participation:
        actividad, solicitud = self._cargar(command)

        fecha_actividad = (
            actividad.date
            if actividad.date.tzinfo
            else actividad.date.replace(tzinfo=timezone.utc)
        )
        if fecha_actividad <= datetime.now(timezone.utc):
            raise CannotJoinPastActivityException()

        aceptados = self.participation_repository.count_by_activity_id(
            command.activity_id
        )
        if aceptados >= actividad.capacity:
            raise ActivityCapacityExceededException()

        solicitud.aceptar()
        self.participation_repository.save(solicitud)
        self.uow.commit()
        return solicitud


class RechazarSolicitudUseCase(_RevisarSolicitudUseCase):
    def execute(self, command: RevisarSolicitudCommand) -> Participation:
        _, solicitud = self._cargar(command)

        solicitud.rechazar()
        self.participation_repository.save(solicitud)
        self.uow.commit()
        return solicitud
