from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.application.use_cases.lista_de_espera import (
    llenar_cupos_desde_lista_de_espera,
)
from app.modules.participations.domain.entities.participation import EstadoParticipacion
from app.modules.participations.domain.exceptions import (
    CannotLeavePastActivityException,
    ParticipationNotFoundException,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.shared.application.ports import UnitOfWork


@dataclass(slots=True)
class LeaveActivityCommand:
    activity_id: UUID
    user_id: str


class LeaveActivityUseCase:
    def __init__(
        self,
        activity_repository: ActivityRepository,
        participation_repository: ParticipationRepository,
        uow: UnitOfWork,
    ) -> None:
        self.activity_repository = activity_repository
        self.participation_repository = participation_repository
        self.uow = uow

    def execute(self, command: LeaveActivityCommand) -> None:
        # FOR UPDATE: nadie más toma el cupo mientras entra el primero en espera
        activity = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not activity:
            raise ActivityNotFoundException()

        now = datetime.now(timezone.utc)
        act_date = (
            activity.date
            if activity.date.tzinfo
            else activity.date.replace(tzinfo=timezone.utc)
        )
        if act_date <= now:
            raise CannotLeavePastActivityException()

        # Una solicitud rechazada no se puede borrar: así no se puede volver a solicitar
        solicitud = self.participation_repository.get_by_activity_and_user(
            command.activity_id, command.user_id
        )
        if solicitud is None or solicitud.estado == EstadoParticipacion.RECHAZADA:
            raise ParticipationNotFoundException()

        deleted = self.participation_repository.delete(
            command.activity_id,
            command.user_id,
        )
        if not deleted:
            raise ParticipationNotFoundException()

        # Si quien cancela ocupaba un cupo, entra el primero de la lista de espera
        if solicitud.estado == EstadoParticipacion.ACEPTADA:
            llenar_cupos_desde_lista_de_espera(activity, self.participation_repository)

        self.uow.commit()
