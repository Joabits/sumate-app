from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.modules.activities.domain.entities.activity import Activity
from app.modules.participations.domain.entities.participation import (
    Participation,
    ParticipationStatus,
)


class ParticipationRepository(ABC):
    @abstractmethod
    def save(self, participation: Participation) -> None:
        ...

    @abstractmethod
    def get_by_activity_and_user(
        self, activity_id: UUID, user_id: str
    ) -> Participation | None:
        """Solicitud del usuario en la actividad, en cualquier estado."""
        ...

    @abstractmethod
    def count_by_activity_id(self, activity_id: UUID) -> int:
        """Cuenta solo las participaciones confirmadas (aceptadas)."""
        ...

    @abstractmethod
    def delete(self, activity_id: UUID, user_id: str) -> bool:
        ...

    @abstractmethod
    def delete_unconfirmed_by_activity_id(self, activity_id: UUID) -> None:
        """Borra las solicitudes pendientes y rechazadas de una actividad."""
        ...

    @abstractmethod
    def list_user_participated_activities(
        self, user_id: str
    ) -> list[tuple[Participation, Activity, datetime, str | None, str | None]]:
        ...

    @abstractmethod
    def list_participants_by_activity_id(
        self,
        activity_id: UUID,
        status: ParticipationStatus = ParticipationStatus.ACCEPTED,
    ) -> list[tuple[Participation, str, str | None]]:
        ...
