import math
from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from app.modules.activities.infrastructure.persistence.models.activity_cause_model import (
    ActivityCauseModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_detail_model import (
    ActivityDetailModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)
from sqlalchemy import Integer, func
from sqlmodel import select
from sqlmodel.sql.expression import SelectOfScalar

LOCAL_TZ = ZoneInfo("America/La_Paz")


def _to_local_datetime(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ)


def _to_storage_datetime(dt_local: datetime) -> datetime:
    return dt_local.astimezone(timezone.utc).replace(tzinfo=None)


def apply_search_query_filter(statement: SelectOfScalar, query: str | None) -> SelectOfScalar:
    if query and query.strip():
        return statement.where(ActivityModel.name.ilike(f"%{query.strip()}%"))
    return statement


def apply_date_preset_filter(
    statement: SelectOfScalar, date_preset: str | None, min_date: datetime
) -> SelectOfScalar:
    storage_min_date = min_date.replace(tzinfo=None) if min_date.tzinfo else min_date
    now_local = _to_local_datetime(min_date)

    if date_preset == "starting_soon":
        return statement.where(
            ActivityModel.date >= storage_min_date,
            ActivityModel.date <= storage_min_date + timedelta(hours=24),
        )
    if date_preset == "today":
        end_today_local = now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
        end_today_utc = _to_storage_datetime(end_today_local)
        return statement.where(
            ActivityModel.date >= storage_min_date,
            ActivityModel.date <= end_today_utc,
        )
    if date_preset == "tomorrow":
        tomorrow_local = now_local + timedelta(days=1)
        start_tomorrow_local = tomorrow_local.replace(hour=0, minute=0, second=0, microsecond=0)
        end_tomorrow_local = tomorrow_local.replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= _to_storage_datetime(start_tomorrow_local),
            ActivityModel.date <= _to_storage_datetime(end_tomorrow_local),
        )
    if date_preset == "this_weekend":
        days_to_sat = 5 - now_local.weekday()
        if now_local.weekday() >= 5:
            start_weekend_local = now_local
        else:
            start_weekend_local = (now_local + timedelta(days=days_to_sat)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        days_to_sun = 6 - now_local.weekday()
        end_weekend_local = (now_local + timedelta(days=days_to_sun)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= _to_storage_datetime(start_weekend_local),
            ActivityModel.date <= _to_storage_datetime(end_weekend_local),
        )
    if date_preset == "next_week":
        days_to_next_mon = 7 - now_local.weekday()
        start_next_mon_local = (now_local + timedelta(days=days_to_next_mon)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end_next_sun_local = (start_next_mon_local + timedelta(days=6)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= _to_storage_datetime(start_next_mon_local),
            ActivityModel.date <= _to_storage_datetime(end_next_sun_local),
        )
    if date_preset == "next_weekend":
        days_to_next_mon = 7 - now_local.weekday()
        start_next_mon_local = (now_local + timedelta(days=days_to_next_mon)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        start_next_sat_local = (start_next_mon_local + timedelta(days=5)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end_next_sun_local = (start_next_sat_local + timedelta(days=1)).replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        return statement.where(
            ActivityModel.date >= _to_storage_datetime(start_next_sat_local),
            ActivityModel.date <= _to_storage_datetime(end_next_sun_local),
        )
    return statement.where(ActivityModel.date >= storage_min_date)


def apply_time_of_day_filter(
    statement: SelectOfScalar, time_of_day: str | None
) -> SelectOfScalar:
    local_hour = (func.cast(func.extract("hour", ActivityModel.date), Integer) - 4 + 24) % 24
    if time_of_day == "early_morning":
        return statement.where(local_hour.between(0, 5))
    if time_of_day == "morning":
        return statement.where(local_hour.between(6, 11))
    if time_of_day == "afternoon":
        return statement.where(local_hour.between(12, 18))
    if time_of_day == "night":
        return statement.where(local_hour.between(19, 23))
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
