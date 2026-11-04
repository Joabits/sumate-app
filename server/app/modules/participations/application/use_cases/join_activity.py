from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from app.modules.activities.domain.entities.activity import ActivityStatus
from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.participations.domain.entities.participation import (
    EstadoParticipacion,
    Participation,
)
from app.modules.participations.domain.exceptions import (
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
    SolicitudRechazadaException,
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
    """El voluntario solicita participar.

    Si hay cupos la solicitud queda pendiente; si están llenos, en lista de espera.
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

    def execute(self, command: JoinActivityCommand) -> Participation:
        activity = self.activity_repository.get_by_id(
            command.activity_id, for_update=True
        )
        if not activity:
            raise ActivityNotFoundException()

        if activity.owner_id == command.user_id:
            raise CannotJoinOwnActivityException()

        # Una actividad cancelada ya no recibe solicitudes
        activity.ensure_not_cancelled()

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

        solicitud_existente = self.participation_repository.get_by_activity_and_user(
            command.activity_id, command.user_id
        )
        if solicitud_existente is not None:
            if solicitud_existente.estado == EstadoParticipacion.RECHAZADA:
                raise SolicitudRechazadaException()
            raise AlreadyParticipatingException()

        aceptados = self.participation_repository.count_by_activity_id(
            command.activity_id
        )
        if aceptados >= activity.capacity:
            # Cupos llenos: la solicitud espera su turno en la lista de espera
            participation = Participation.crear_en_espera(
                activity_id=command.activity_id,
                user_id=command.user_id,
            )
        else:
            participation = Participation.create(
                activity_id=command.activity_id,
                user_id=command.user_id,
            )
        self.participation_repository.save(participation)
        self.uow.commit()
        return participation
