"""Fechas: la base guarda UTC y las reglas se piensan en hora de Bolivia."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

ZONA_BOLIVIA = ZoneInfo("America/La_Paz")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """Las fechas sin zona horaria se guardan en UTC."""
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def already_passed(value: datetime, now: datetime | None = None) -> bool:
    return as_utc(value) <= (now or utc_now())


def hoy_en_bolivia() -> date:
    return datetime.now(ZONA_BOLIVIA).date()


def dia_en_bolivia(momento: datetime) -> date:
    return as_utc(momento).astimezone(ZONA_BOLIVIA).date()
