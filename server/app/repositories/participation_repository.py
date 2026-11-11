from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement
from sqlmodel import Session, select

from app.entities.activity import Activity
from app.entities.participation import (
    ESTADOS_QUE_SE_CANCELAN,
    EstadoParticipacion,
    Participation,
)


def ocupa_cupo() -> ColumnElement[bool]:
    """
    Única condición de lo que cuenta como participación confirmada (ocupa un cupo).
    Todas las consultas que cuentan inscritos la usan, así la regla vive en un solo lugar.
    """
    return and_(
        Participation.deleted_date.is_(None),
        Participation.status == EstadoParticipacion.ACEPTADA.value,
    )


class ParticipationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_of_user(self, activity_id: UUID, user_id: str) -> Participation | None:
        """Solicitud del usuario en la actividad, en cualquier estado."""
        statement = select(Participation).where(
            Participation.activity_id == activity_id,
            Participation.user_id == user_id,
            Participation.deleted_date.is_(None),
        )
        return self.session.exec(statement).first()

    def count_accepted(self, activity_id: UUID) -> int:
        statement = select(func.count(Participation.id)).where(
            Participation.activity_id == activity_id, ocupa_cupo()
        )
        return int(self.session.exec(statement).one())

    def count_accepted_by_activity(self, activity_ids: list[UUID]) -> dict[UUID, int]:
        result: dict[UUID, int] = {activity_id: 0 for activity_id in activity_ids}
        if not activity_ids:
            return result
        statement = (
            select(Participation.activity_id, func.count(Participation.id))
            .where(Participation.activity_id.in_(activity_ids), ocupa_cupo())
            .group_by(Participation.activity_id)
        )
        for activity_id, count in self.session.exec(statement).all():
            result[activity_id] = int(count)
        return result

    def find_by_status(
        self, activity_id: UUID, estado: EstadoParticipacion = EstadoParticipacion.ACEPTADA
    ) -> list[Participation]:
        """Solicitudes de la actividad en un estado, en orden de llegada."""
        statement = (
            select(Participation)
            .where(
                Participation.activity_id == activity_id,
                Participation.deleted_date.is_(None),
                Participation.status == estado.value,
            )
            .order_by(Participation.created_date.asc())
        )
        return list(self.session.exec(statement).all())

    def find_waiting(self, activity_id: UUID) -> list[Participation]:
        # Orden de llegada: la primera en solicitar es la primera en entrar
        return self.find_by_status(activity_id, EstadoParticipacion.EN_ESPERA)

    def find_applicants(self, activity_id: UUID) -> list[Participation]:
        """Solicitudes pendientes, aceptadas y en lista de espera de una actividad."""
        statement = select(Participation).where(
            Participation.activity_id == activity_id,
            Participation.deleted_date.is_(None),
            Participation.status.in_([e.value for e in ESTADOS_QUE_SE_CANCELAN]),
        )
        return list(self.session.exec(statement).all())

    def find_of_user_with_activity(self, user_id: str) -> list[Participation]:
        """Solicitudes del voluntario con su actividad (Mis solicitudes)."""
        statement = (
            select(Participation)
            .join(Activity, Participation.activity_id == Activity.id)
            .where(
                Participation.user_id == user_id,
                Participation.deleted_date.is_(None),
                Activity.deleted_date.is_(None),
                Activity.owner_id != user_id,
            )
            .options(selectinload(Participation.activity))
        )
        return list(self.session.exec(statement).all())

    def save(self, participation: Participation) -> Participation:
        self.session.add(participation)
        return participation

    def delete(self, participation: Participation) -> None:
        self.session.delete(participation)

    def delete_unconfirmed(self, activity_id: UUID) -> None:
        """Borra las solicitudes que no ocupan cupo (pendientes, rechazadas, en espera)."""
        statement = select(Participation).where(
            Participation.activity_id == activity_id,
            Participation.status != EstadoParticipacion.ACEPTADA.value,
        )
        for participation in self.session.exec(statement).all():
            self.session.delete(participation)

    def flush(self) -> None:
        self.session.flush()
