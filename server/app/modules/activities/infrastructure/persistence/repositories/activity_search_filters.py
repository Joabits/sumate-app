from datetime import datetime, timedelta
import math
from uuid import UUID

from app.modules.activities.infrastructure.persistence.models.activity_cause_model import (
    ActivityCauseModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_detail_model import (
    ActivityDetailModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.sql.expression import SelectOfScalar


def apply_search_query_filter(statement: SelectOfScalar, query: str | None) -> SelectOfScalar:
    if query and query.strip():
        return statement.where(ActivityModel.name.ilike(f"%{query.strip()}%"))
    return statement


def apply_date_preset_filter(
    statement: SelectOfScalar, date_preset: str | None, min_date: datetime
) -> SelectOfScalar:
    if date_preset == "starting_soon":
        return statement.where(
            ActivityModel.date >= min_date,
            ActivityModel.date <= min_date + timedelta(hours=24),
        )
    if date_preset == "today":
        end_today = min_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        return statement.where(
            ActivityModel.date >= min_date,
            ActivityModel.date <= end_today,
        )
    if date_preset == "tomorrow":
        start_tomorrow = (min_date + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end_tomorrow = (min_date + timedelta(days=1)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= start_tomorrow,
            ActivityModel.date <= end_tomorrow,
        )
    if date_preset == "this_weekend":
        days_to_sat = 5 - min_date.weekday()
        if min_date.weekday() >= 5:
            start_weekend = min_date
        else:
            start_weekend = (min_date + timedelta(days=days_to_sat)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        days_to_sun = 6 - min_date.weekday()
        end_weekend = (min_date + timedelta(days=days_to_sun)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= start_weekend,
            ActivityModel.date <= end_weekend,
        )
    if date_preset == "next_week":
        days_to_next_mon = 7 - min_date.weekday()
        start_next_mon = (min_date + timedelta(days=days_to_next_mon)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end_next_sun = (start_next_mon + timedelta(days=6)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= start_next_mon,
            ActivityModel.date <= end_next_sun,
        )
    if date_preset == "next_weekend":
        days_to_next_mon = 7 - min_date.weekday()
        start_next_mon = (min_date + timedelta(days=days_to_next_mon)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        start_next_sat = (start_next_mon + timedelta(days=5)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end_next_sun = (start_next_sat + timedelta(days=1)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= start_next_sat,
            ActivityModel.date <= end_next_sun,
        )
    return statement.where(ActivityModel.date >= min_date)


def apply_time_of_day_filter(
    statement: SelectOfScalar, time_of_day: str | None
) -> SelectOfScalar:
    if time_of_day == "early_morning":
        return statement.where(func.extract("hour", ActivityModel.date).between(0, 5))
    if time_of_day == "morning":
        return statement.where(func.extract("hour", ActivityModel.date).between(6, 11))
    if time_of_day == "afternoon":
        return statement.where(func.extract("hour", ActivityModel.date).between(12, 18))
    if time_of_day == "night":
        return statement.where(func.extract("hour", ActivityModel.date).between(19, 23))
    return statement


def apply_capacity_filter(
    statement: SelectOfScalar, capacity_range: str | None
) -> SelectOfScalar:
    if capacity_range == "1-9":
        return statement.where(ActivityModel.capacity.between(1, 9))
    if capacity_range == "10-20":
        return statement.where(ActivityModel.capacity.between(10, 20))
    if capacity_range == "gt-20":
        return statement.where(ActivityModel.capacity > 20)
    return statement


def apply_causes_filter(
    statement: SelectOfScalar, cause_ids: tuple[UUID, ...]
) -> SelectOfScalar:
    if cause_ids:
        cause_subquery = select(ActivityCauseModel.activity_id).where(
            ActivityCauseModel.cause_id.in_(cause_ids),
            ActivityCauseModel.deleted_date.is_(None),
        )
        return statement.where(ActivityModel.id.in_(cause_subquery))
    return statement


def apply_distance_filter(
    statement: SelectOfScalar,
    user_latitude: float | None,
    user_longitude: float | None,
    max_distance_km: float | None,
) -> SelectOfScalar:
    if (
        user_latitude is not None
        and user_longitude is not None
        and max_distance_km is not None
    ):
        statement = statement.outerjoin(
            ActivityDetailModel, ActivityModel.id == ActivityDetailModel.activity_id
        ).where(
            ActivityDetailModel.latitude.is_not(None),
            ActivityDetailModel.longitude.is_not(None),
        )
        lat_u_rad = math.radians(user_latitude)
        lon_u_rad = math.radians(user_longitude)
        lat_act_rad = func.radians(ActivityDetailModel.latitude)
        lon_act_rad = func.radians(ActivityDetailModel.longitude)
        dist_expr = 6371.0 * func.acos(
            func.least(
                1.0,
                func.greatest(
                    -1.0,
                    func.sin(lat_u_rad) * func.sin(lat_act_rad)
                    + func.cos(lat_u_rad)
                    * func.cos(lat_act_rad)
                    * func.cos(lon_act_rad - lon_u_rad),
                ),
            )
        )
        return statement.where(dist_expr <= max_distance_km)
    return statement
