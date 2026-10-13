import math
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.domain.entities.activity_detail import ActivityDetail
from app.modules.activities.domain.entities.cause import Cause
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.modules.activities.infrastructure.persistence.mappers.activity_detail_mapper import (
    ActivityDetailMapper,
)
from app.modules.activities.infrastructure.persistence.mappers.activity_mapper import (
    ActivityMapper,
)
from app.modules.activities.infrastructure.persistence.mappers.cause_mapper import (
    CauseMapper,
)
from app.modules.activities.infrastructure.persistence.repositories.activity_search_filters import (
    apply_capacity_filter,
    apply_causes_filter,
    apply_date_preset_filter,
    apply_distance_filter,
    apply_search_query_filter,
    apply_time_of_day_filter,
)
from app.modules.activities.infrastructure.persistence.models.activity_cause_model import (
    ActivityCauseModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_detail_model import (
    ActivityDetailModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)
from app.modules.activities.infrastructure.persistence.models.cause_model import (
    CauseModel,
)
from app.modules.participations.infrastructure.persistence.models.participation_model import (
    ParticipationModel,
)
from app.shared.infrastructure.db.better_auth import BetterAuthUser
from sqlalchemy import func
from sqlmodel import Session, select


class SQLModelActivityRepository(ActivityRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(
        self, activity_id: UUID, for_update: bool = False
    ) -> Activity | None:
        statement = (
            select(
                ActivityModel,
                BetterAuthUser.name.label("creator_name"),
                BetterAuthUser.image.label("creator_image"),
            )
            .outerjoin(BetterAuthUser, ActivityModel.owner_id == BetterAuthUser.id)
            .where(
                ActivityModel.id == activity_id,
                ActivityModel.deleted_date.is_(None),
            )
        )
        if for_update:
            statement = statement.with_for_update(of=ActivityModel)
        result = self.db.exec(statement).first()
        if not result:
            return None
        record, creator_name, creator_image = result
        return ActivityMapper.to_domain(
            record,
            creator_name=creator_name,
            creator_image=creator_image,
        )

    def list_explore(
        self,
        *,
        exclude_owner_id: str,
        min_date: datetime,
    ) -> list[Activity]:
        statement = (
            select(
                ActivityModel,
                BetterAuthUser.name.label("creator_name"),
                BetterAuthUser.image.label("creator_image"),
            )
            .outerjoin(BetterAuthUser, ActivityModel.owner_id == BetterAuthUser.id)
            .where(
                ActivityModel.deleted_date.is_(None),
                ActivityModel.owner_id != exclude_owner_id,
                ActivityModel.status == "active",
                ActivityModel.date >= min_date,
            )
            .order_by(ActivityModel.date.asc())
        )
        results = self.db.exec(statement).all()
        return [
            ActivityMapper.to_domain(
                record,
                creator_name=creator_name,
                creator_image=creator_image,
            )
            for record, creator_name, creator_image in results
        ]

    def search_activities(
        self,
        *,
        query: str | None = None,
        time_of_day: str | None = None,
        date_preset: str | None = None,
        capacity_range: str | None = None,
        cause_ids: tuple[UUID, ...] = (),
        user_latitude: float | None = None,
        user_longitude: float | None = None,
        max_distance_km: float | None = None,
        min_date: datetime,
    ) -> list[Activity]:
        subquery = (
            select(
                ParticipationModel.activity_id,
                func.count(ParticipationModel.id).label("registered_count"),
            )
            .where(ParticipationModel.deleted_date.is_(None))
            .group_by(ParticipationModel.activity_id)
            .subquery()
        )
        statement = (
            select(
                ActivityModel,
                BetterAuthUser.name.label("creator_name"),
                BetterAuthUser.image.label("creator_image"),
            )
            .outerjoin(BetterAuthUser, ActivityModel.owner_id == BetterAuthUser.id)
            .outerjoin(subquery, ActivityModel.id == subquery.c.activity_id)
            .where(
                ActivityModel.deleted_date.is_(None),
                ActivityModel.status == "active",
                ActivityModel.capacity > func.coalesce(subquery.c.registered_count, 0),
            )
        )

        statement = apply_search_query_filter(statement, query)
        statement = apply_date_preset_filter(statement, date_preset, min_date)
        statement = apply_time_of_day_filter(statement, time_of_day)
        statement = apply_capacity_filter(statement, capacity_range)
        statement = apply_causes_filter(statement, cause_ids)
        statement = apply_distance_filter(
            statement, user_latitude, user_longitude, max_distance_km
        )

        statement = statement.order_by(ActivityModel.date.asc())
        results = self.db.exec(statement).all()
        return [
            ActivityMapper.to_domain(
                record,
                creator_name=creator_name,
                creator_image=creator_image,
            )
            for record, creator_name, creator_image in results
        ]

    def list_my_activities(
        self,
        *,
        owner_id: str,
    ) -> list[tuple[Activity, int]]:
        subquery = (
            select(
                ParticipationModel.activity_id,
                func.count(ParticipationModel.id).label("registered_count"),
            )
            .where(ParticipationModel.deleted_date.is_(None))
            .group_by(ParticipationModel.activity_id)
            .subquery()
        )
        statement = (
            select(
                ActivityModel,
                BetterAuthUser.name.label("creator_name"),
                BetterAuthUser.image.label("creator_image"),
                func.coalesce(subquery.c.registered_count, 0).label("registered_count"),
            )
            .outerjoin(BetterAuthUser, ActivityModel.owner_id == BetterAuthUser.id)
            .outerjoin(subquery, ActivityModel.id == subquery.c.activity_id)
            .where(
                ActivityModel.owner_id == owner_id,
                ActivityModel.deleted_date.is_(None),
            )
            .order_by(ActivityModel.created_date.desc())
        )
        results = self.db.exec(statement).all()
        return [
            (
                ActivityMapper.to_domain(
                    record,
                    creator_name=creator_name,
                    creator_image=creator_image,
                ),
                int(reg_count),
            )
            for record, creator_name, creator_image, reg_count in results
        ]

    def save(self, activity: Activity) -> None:
        record = self.db.get(ActivityModel, activity.id)
        if record is None:
            model = ActivityMapper.to_model(activity)
            self.db.add(model)
            return

        record.name = activity.name
        record.owner_id = activity.owner_id
        record.image_url = activity.image_url
        record.date = activity.date
        record.capacity = activity.capacity
        record.status = (
            activity.status.value
            if hasattr(activity.status, "value")
            else str(activity.status)
        )
        record.modified_date = datetime.now(timezone.utc)

    def save_detail(self, detail: ActivityDetail) -> None:
        statement = select(ActivityDetailModel).where(
            ActivityDetailModel.activity_id == detail.activity_id
        )
        record = self.db.exec(statement).first()
        if record is None:
            model = ActivityDetailMapper.to_model(detail)
            self.db.add(model)
            return

        record.latitude = detail.latitude
        record.longitude = detail.longitude
        record.place = detail.place
        record.address = detail.address
        record.description = detail.description
        record.modified_date = datetime.now(timezone.utc)

    def get_detail_record(self, activity_id: UUID) -> ActivityDetail | None:
        statement = select(ActivityDetailModel).where(
            ActivityDetailModel.activity_id == activity_id
        )
        record = self.db.exec(statement).first()
        if not record:
            return None
        return ActivityDetailMapper.to_domain(record)

    def get_detail_by_activity_id(
        self, activity_id: UUID
    ) -> tuple[Activity, ActivityDetail | None] | None:
        statement = (
            select(
                ActivityModel,
                BetterAuthUser.name.label("creator_name"),
                BetterAuthUser.image.label("creator_image"),
                ActivityDetailModel,
            )
            .outerjoin(BetterAuthUser, ActivityModel.owner_id == BetterAuthUser.id)
            .outerjoin(
                ActivityDetailModel,
                ActivityModel.id == ActivityDetailModel.activity_id,
            )
            .where(
                ActivityModel.id == activity_id,
                ActivityModel.deleted_date.is_(None),
            )
        )
        result = self.db.exec(statement).first()
        if not result:
            return None

        act_model, creator_name, creator_image, detail_model = result
        activity = ActivityMapper.to_domain(
            act_model,
            creator_name=creator_name,
            creator_image=creator_image,
        )
        detail = ActivityDetailMapper.to_domain(detail_model) if detail_model else None
        return (activity, detail)

    def get_causes_by_activity_id(self, activity_id: UUID) -> list[Cause]:
        statement = (
            select(CauseModel)
            .join(ActivityCauseModel, ActivityCauseModel.cause_id == CauseModel.id)
            .where(
                ActivityCauseModel.activity_id == activity_id,
                ActivityCauseModel.deleted_date.is_(None),
                CauseModel.deleted_date.is_(None),
            )
            .order_by(CauseModel.name.asc())
        )
        records = self.db.exec(statement).all()
        return [CauseMapper.to_domain(record) for record in records]

    def get_causes_for_activities(
        self, activity_ids: list[UUID]
    ) -> dict[UUID, list[Cause]]:
        if not activity_ids:
            return {}
        statement = (
            select(ActivityCauseModel.activity_id, CauseModel)
            .join(CauseModel, ActivityCauseModel.cause_id == CauseModel.id)
            .where(
                ActivityCauseModel.activity_id.in_(activity_ids),
                ActivityCauseModel.deleted_date.is_(None),
                CauseModel.deleted_date.is_(None),
            )
            .order_by(CauseModel.name.asc())
        )
        rows = self.db.exec(statement).all()
        result: dict[UUID, list[Cause]] = {act_id: [] for act_id in activity_ids}
        for act_id, cause_model in rows:
            result[act_id].append(CauseMapper.to_domain(cause_model))
        return result

    def replace_activity_causes(
        self, activity_id: UUID, cause_ids: list[UUID]
    ) -> None:
        existing_statement = select(ActivityCauseModel).where(
            ActivityCauseModel.activity_id == activity_id
        )
        existing_records = self.db.exec(existing_statement).all()
        for record in existing_records:
            self.db.delete(record)

        for cause_id in cause_ids:
            new_rel = ActivityCauseModel(
                activity_id=activity_id,
                cause_id=cause_id,
            )
            self.db.add(new_rel)

    def delete(self, activity: Activity) -> None:
        statement_causes = select(ActivityCauseModel).where(
            ActivityCauseModel.activity_id == activity.id
        )
        cause_records = self.db.exec(statement_causes).all()
        for cause_record in cause_records:
            self.db.delete(cause_record)

        statement_detail = select(ActivityDetailModel).where(
            ActivityDetailModel.activity_id == activity.id
        )
        detail_record = self.db.exec(statement_detail).first()
        if detail_record:
            self.db.delete(detail_record)

        record = self.db.get(ActivityModel, activity.id)
        if record:
            self.db.delete(record)
