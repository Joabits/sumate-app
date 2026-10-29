from sqlalchemy import and_
from sqlalchemy.sql.elements import ColumnElement

from app.modules.participations.domain.entities.participation import ParticipationStatus
from app.modules.participations.infrastructure.persistence.models.participation_model import (
    ParticipationModel,
)


def confirmed_participation() -> ColumnElement[bool]:
    """Condición única de lo que cuenta como participación confirmada (ocupa un cupo).

    Todas las consultas que cuentan inscritos deben usar esta función,
    así la regla se cambia en un solo lugar.
    """
    return and_(
        ParticipationModel.deleted_date.is_(None),
        ParticipationModel.status == ParticipationStatus.ACCEPTED.value,
    )
