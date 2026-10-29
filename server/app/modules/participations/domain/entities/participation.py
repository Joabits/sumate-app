from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID, uuid4

from app.modules.participations.domain.exceptions import RequestNotPendingException


class ParticipationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


@dataclass
class Participation:
    id: UUID
    activity_id: UUID
    user_id: str
    status: ParticipationStatus = ParticipationStatus.PENDING

    @classmethod
    def create(
        cls,
        activity_id: UUID,
        user_id: str,
    ) -> "Participation":
        """Toda participación nace como solicitud pendiente de revisión del organizador."""
        return cls(
            id=uuid4(),
            activity_id=activity_id,
            user_id=user_id,
            status=ParticipationStatus.PENDING,
        )

    def accept(self) -> None:
        if self.status != ParticipationStatus.PENDING:
            raise RequestNotPendingException()
        self.status = ParticipationStatus.ACCEPTED

    def reject(self) -> None:
        if self.status != ParticipationStatus.PENDING:
            raise RequestNotPendingException()
        self.status = ParticipationStatus.REJECTED
