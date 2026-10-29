from app.modules.participations.domain.entities.participation import (
    Participation,
    ParticipationStatus,
)
from app.modules.participations.infrastructure.persistence.models.participation_model import (
    ParticipationModel,
)


class ParticipationMapper:
    @staticmethod
    def to_domain(model: ParticipationModel) -> Participation:
        return Participation(
            id=model.id,
            activity_id=model.activity_id,
            user_id=model.user_id,
            status=ParticipationStatus(model.status),
        )

    @staticmethod
    def to_model(domain: Participation) -> ParticipationModel:
        return ParticipationModel(
            id=domain.id,
            activity_id=domain.activity_id,
            user_id=domain.user_id,
            status=domain.status.value,
        )
