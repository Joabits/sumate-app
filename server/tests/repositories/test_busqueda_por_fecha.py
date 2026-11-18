"""
Filtros de fecha de la búsqueda: cada atajo arma el rango correcto en hora de
Bolivia (UTC-4) y lo guarda en UTC sin zona, como está en la base.
"""

from datetime import datetime, timezone

import pytest
from sqlmodel import select

from app.entities import Activity, Participation
from app.repositories.activity_search import _to_local_datetime, apply_date_preset_filter
from app.repositories.participation_repository import ParticipationRepository
from tests.helpers import crear_actividad, crear_solicitud

# Miércoles 18/11/2026 a las 12:00 en Bolivia
MIERCOLES = datetime(2026, 11, 18, 16, 0, tzinfo=timezone.utc)
# Sábado 21/11/2026 a las 12:00 en Bolivia
SABADO = datetime(2026, 11, 21, 16, 0, tzinfo=timezone.utc)


def rango(preset: str, desde: datetime) -> list[datetime]:
    statement = apply_date_preset_filter(select(Activity), preset, desde)
    return [v for v in statement.compile().params.values() if isinstance(v, datetime)]


def test_empieza_pronto_son_las_proximas_24_horas():
    assert rango("starting_soon", MIERCOLES) == [
        datetime(2026, 11, 18, 16, 0),
        datetime(2026, 11, 19, 16, 0),
    ]


def test_este_fin_de_semana_desde_un_dia_de_semana():
    assert rango("this_weekend", MIERCOLES) == [
        datetime(2026, 11, 21, 4, 0),
        datetime(2026, 11, 23, 3, 59, 59, 999999),
    ]


def test_este_fin_de_semana_un_sabado_empieza_ahora():
    assert rango("this_weekend", SABADO) == [
        datetime(2026, 11, 21, 16, 0),
        datetime(2026, 11, 23, 3, 59, 59, 999999),
    ]


def test_la_proxima_semana_va_de_lunes_a_domingo():
    assert rango("next_week", MIERCOLES) == [
        datetime(2026, 11, 23, 4, 0),
        datetime(2026, 11, 30, 3, 59, 59, 999999),
    ]


def test_el_proximo_fin_de_semana():
    assert rango("next_weekend", MIERCOLES) == [
        datetime(2026, 11, 28, 4, 0),
        datetime(2026, 11, 30, 3, 59, 59, 999999),
    ]


@pytest.mark.parametrize("sin_zona", [datetime(2026, 11, 18, 16, 0)])
def test_una_fecha_sin_zona_se_toma_como_utc(sin_zona):
    assert _to_local_datetime(sin_zona).hour == 12


def test_borrar_una_solicitud(db_session):
    activity = crear_actividad(db_session)
    solicitud = crear_solicitud(db_session, activity, "voluntario")
    ParticipationRepository(db_session).delete(solicitud)
    db_session.commit()
    assert db_session.exec(select(Participation)).all() == []
