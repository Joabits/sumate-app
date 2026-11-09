"""
Búsqueda de actividades con filtros (pantalla Buscar).

Es parte del modelo Activity: arma la consulta SQL a partir de los filtros
que elige el voluntario.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import Integer, func, or_
from sqlmodel import Session, select
from sqlmodel.sql.expression import SelectOfScalar

from app.models.activity import Activity, ActivityStatus
from app.models.activity_detail import ActivityDetail
from app.models.cause import ActivityCause, Cause

LOCAL_TZ = ZoneInfo("America/La_Paz")


@dataclass(frozen=True, slots=True)
class SearchFilters:
    query: str | None = None
    time_of_day: str | None = None
    date_preset: str | None = None
    capacity_range: str | None = None
    cause_ids: tuple[UUID, ...] = ()
    user_latitude: float | None = None
    user_longitude: float | None = None
    max_distance_km: float | None = None


def search_activities(
    session: Session, filters: SearchFilters, *, min_date: datetime
) -> list[Activity]:
    # Las actividades llenas también aparecen: se puede entrar a su lista de espera
    statement = select(Activity).where(
        Activity.deleted_date.is_(None),
        Activity.status == ActivityStatus.ACTIVE.value,
    )
    statement = apply_search_query_filter(statement, filters.query)
    statement = apply_date_preset_filter(statement, filters.date_preset, min_date)
    statement = apply_time_of_day_filter(statement, filters.time_of_day)
    statement = apply_capacity_filter(statement, filters.capacity_range)
    statement = apply_causes_filter(statement, filters.cause_ids)
    statement = apply_distance_filter(
        statement, filters.user_latitude, filters.user_longitude, filters.max_distance_km
    )
    statement = statement.order_by(Activity.date.asc())
    return list(session.exec(statement).all())


def _to_local_datetime(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(LOCAL_TZ)


def _to_storage_datetime(dt_local: datetime) -> datetime:
    return dt_local.astimezone(timezone.utc).replace(tzinfo=None)


def apply_search_query_filter(statement: SelectOfScalar, query: str | None) -> SelectOfScalar:
    if not query or not query.strip():
        return statement
    pattern = f"%{query.strip()}%"
    # Busca en el nombre, en las causas y en el lugar de la actividad
    by_cause = (
        select(ActivityCause.activity_id)
        .join(Cause, ActivityCause.cause_id == Cause.id)
        .where(ActivityCause.deleted_date.is_(None), Cause.name.ilike(pattern))
    )
    by_place = select(ActivityDetail.activity_id).where(
        or_(ActivityDetail.place.ilike(pattern), ActivityDetail.address.ilike(pattern))
    )
    return statement.where(
        or_(
            Activity.name.ilike(pattern),
            Activity.id.in_(by_cause),
            Activity.id.in_(by_place),
        )
    )


def _between(statement: SelectOfScalar, start: datetime, end: datetime) -> SelectOfScalar:
    return statement.where(Activity.date >= start, Activity.date <= end)


def apply_date_preset_filter(
    statement: SelectOfScalar, date_preset: str | None, min_date: datetime
) -> SelectOfScalar:
    storage_min_date = min_date.replace(tzinfo=None) if min_date.tzinfo else min_date
    now_local = _to_local_datetime(min_date)
    start_of_day = {"hour": 0, "minute": 0, "second": 0, "microsecond": 0}
    end_of_day = {"hour": 23, "minute": 59, "second": 59, "microsecond": 999999}

    if date_preset == "starting_soon":
        return _between(statement, storage_min_date, storage_min_date + timedelta(hours=24))
    if date_preset == "today":
        end_today = _to_storage_datetime(now_local.replace(**end_of_day))
        return _between(statement, storage_min_date, end_today)
    if date_preset == "tomorrow":
        tomorrow = now_local + timedelta(days=1)
        return _between(
            statement,
            _to_storage_datetime(tomorrow.replace(**start_of_day)),
            _to_storage_datetime(tomorrow.replace(**end_of_day)),
        )
    if date_preset == "this_weekend":
        weekday = now_local.weekday()
        if weekday >= 5:
            start_weekend = now_local
        else:
            start_weekend = (now_local + timedelta(days=5 - weekday)).replace(**start_of_day)
        end_weekend = (now_local + timedelta(days=6 - weekday)).replace(**end_of_day)
        return _between(
            statement, _to_storage_datetime(start_weekend), _to_storage_datetime(end_weekend)
        )

    next_monday = (now_local + timedelta(days=7 - now_local.weekday())).replace(**start_of_day)
    if date_preset == "next_week":
        next_sunday = (next_monday + timedelta(days=6)).replace(**end_of_day)
        return _between(
            statement, _to_storage_datetime(next_monday), _to_storage_datetime(next_sunday)
        )
    if date_preset == "next_weekend":
        next_saturday = (next_monday + timedelta(days=5)).replace(**start_of_day)
        next_sunday = (next_saturday + timedelta(days=1)).replace(**end_of_day)
        return _between(
            statement, _to_storage_datetime(next_saturday), _to_storage_datetime(next_sunday)
        )
    return statement.where(Activity.date >= storage_min_date)


def apply_time_of_day_filter(statement: SelectOfScalar, time_of_day: str | None) -> SelectOfScalar:
    # Hora local de Bolivia (UTC-4)
    local_hour = (func.cast(func.extract("hour", Activity.date), Integer) - 4 + 24) % 24
    ranges = {
        "early_morning": (0, 5),
        "morning": (6, 11),
        "afternoon": (12, 18),
        "night": (19, 23),
    }
    if time_of_day in ranges:
        start, end = ranges[time_of_day]
        return statement.where(local_hour.between(start, end))
    return statement


def apply_capacity_filter(statement: SelectOfScalar, capacity_range: str | None) -> SelectOfScalar:
    if capacity_range == "1-9":
        return statement.where(Activity.capacity.between(1, 9))
    if capacity_range == "10-20":
        return statement.where(Activity.capacity.between(10, 20))
    if capacity_range == "gt-20":
        return statement.where(Activity.capacity > 20)
    return statement


def apply_causes_filter(statement: SelectOfScalar, cause_ids: tuple[UUID, ...]) -> SelectOfScalar:
    if not cause_ids:
        return statement
    cause_subquery = select(ActivityCause.activity_id).where(
        ActivityCause.cause_id.in_(cause_ids),
        ActivityCause.deleted_date.is_(None),
    )
    return statement.where(Activity.id.in_(cause_subquery))


def apply_distance_filter(
    statement: SelectOfScalar,
    user_latitude: float | None,
    user_longitude: float | None,
    max_distance_km: float | None,
) -> SelectOfScalar:
    if user_latitude is None or user_longitude is None or max_distance_km is None:
        return statement
    statement = statement.outerjoin(
        ActivityDetail, Activity.id == ActivityDetail.activity_id
    ).where(
        ActivityDetail.latitude.is_not(None),
        ActivityDetail.longitude.is_not(None),
    )
    # Distancia de gran círculo (fórmula del coseno esférico)
    lat_u = math.radians(user_latitude)
    lon_u = math.radians(user_longitude)
    lat_a = func.radians(ActivityDetail.latitude)
    lon_a = func.radians(ActivityDetail.longitude)
    distance = 6371.0 * func.acos(
        func.least(
            1.0,
            func.greatest(
                -1.0,
                func.sin(lat_u) * func.sin(lat_a)
                + func.cos(lat_u) * func.cos(lat_a) * func.cos(lon_a - lon_u),
            ),
        )
    )
    return statement.where(distance <= max_distance_km)
