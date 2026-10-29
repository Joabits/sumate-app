from datetime import datetime, timezone
from uuid import UUID

from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.infrastructure.persistence.mappers.activity_mapper import (
    ActivityMapper,
)
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)
from app.modules.participations.domain.entities.participation import (
    EstadoParticipacion,
    Participation,
)
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)
from app.modules.participations.infrastructure.persistence.filtros import (
    participacion_confirmada,
)
from app.modules.participations.infrastructure.persistence.mappers.participation_mapper import (
    ParticipationMapper,
)
from app.modules.participations.infrastructure.persistence.models.participation_model import (
    ParticipationModel,
)
from app.shared.infrastructure.db.better_auth import BetterAuthUser
from sqlalchemy import func
from sqlmodel import Session, select


class SQLModelParticipationRepository(ParticipationRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def save(self, participation: Participation) -> None:
        record = self.db.get(ParticipationModel, participation.id)
        if record is None:
            model = ParticipationMapper.to_model(participation)
            self.db.add(model)
            return

        record.activity_id = participation.activity_id
        record.user_id = participation.user_id
        record.status = participation.estado.value
        record.modified_date = datetime.now(timezone.utc)

    def get_by_activity_and_user(
        self, activity_id: UUID, user_id: str
    ) -> Participation | None:
        statement = select(ParticipationModel).where(
            ParticipationModel.activity_id == activity_id,
            ParticipationModel.user_id == user_id,
            ParticipationModel.deleted_date.is_(None),
        )
        record = self.db.exec(statement).first()
        if not record:
            return None
        return ParticipationMapper.to_domain(record)

    def count_by_activity_id(self, activity_id: UUID) -> int:
        statement = select(func.count(ParticipationModel.id)).where(
            ParticipationModel.activity_id == activity_id,
            participacion_confirmada(),
        )
        count = self.db.exec(statement).one()
        return int(count)

    def eliminar_no_confirmadas(self, activity_id: UUID) -> None:
        statement = select(ParticipationModel).where(
            ParticipationModel.activity_id == activity_id,
            ParticipationModel.status != EstadoParticipacion.ACEPTADA.value,
        )
        for record in self.db.exec(statement).all():
            self.db.delete(record)

    def delete(self, activity_id: UUID, user_id: str) -> bool:
        statement = select(ParticipationModel).where(
            ParticipationModel.activity_id == activity_id,
            ParticipationModel.user_id == user_id,
        )
        record = self.db.exec(statement).first()
        if not record:
            return False
        self.db.delete(record)
        return True

    def list_user_participated_activities(
        self, user_id: str
    ) -> list[tuple[Participation, Activity, datetime, str | None, str | None]]:
        statement = (
            select(
                ParticipationModel,
                ActivityModel,
                BetterAuthUser.name.label("creator_name"),
                BetterAuthUser.image.label("creator_image"),
            )
            .join(ActivityModel, ParticipationModel.activity_id == ActivityModel.id)
            .outerjoin(BetterAuthUser, ActivityModel.owner_id == BetterAuthUser.id)
            .where(
                ParticipationModel.user_id == user_id,
                ParticipationModel.deleted_date.is_(None),
                ActivityModel.deleted_date.is_(None),
                ActivityModel.owner_id != user_id,
            )
        )
        results = self.db.exec(statement).all()
        return [
            (
                ParticipationMapper.to_domain(part),
                ActivityMapper.to_domain(act),
                part.created_date,
                creator_name,
                creator_image,
            )
            for part, act, creator_name, creator_image in results
        ]

    def list_participants_by_activity_id(
        self,
        activity_id: UUID,
        estado: EstadoParticipacion = EstadoParticipacion.ACEPTADA,
    ) -> list[tuple[Participation, str, str | None]]:
        statement = (
            select(
                ParticipationModel,
                BetterAuthUser.name.label("user_name"),
                BetterAuthUser.image.label("user_image"),
            )
            .outerjoin(BetterAuthUser, ParticipationModel.user_id == BetterAuthUser.id)
            .where(
                ParticipationModel.activity_id == activity_id,
                ParticipationModel.deleted_date.is_(None),
                ParticipationModel.status == estado.value,
            )
            .order_by(ParticipationModel.created_date.asc())
        )
        results = self.db.exec(statement).all()
        return [
            (
                ParticipationMapper.to_domain(part),
                user_name or "Usuario",
                user_image,
            )
            for part, user_name, user_image in results
        ]
