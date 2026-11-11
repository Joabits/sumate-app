from uuid import UUID

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.entities.activity import Activity
from app.entities.registro_horas import EstadoHoras, RegistroHoras


class RegistroHorasRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, registro_id: UUID) -> RegistroHoras | None:
        statement = select(RegistroHoras).where(
            RegistroHoras.id == registro_id, RegistroHoras.deleted_date.is_(None)
        )
        return self.session.exec(statement).first()

    def find_by_activity(self, activity_id: UUID, user_id: str | None = None) -> list[RegistroHoras]:
        """Registros de la actividad (o solo los de un voluntario), por jornada."""
        statement = select(RegistroHoras).where(
            RegistroHoras.activity_id == activity_id, RegistroHoras.deleted_date.is_(None)
        )
        if user_id is not None:
            statement = statement.where(RegistroHoras.user_id == user_id)
        statement = statement.order_by(RegistroHoras.jornada.asc(), RegistroHoras.created_date.asc())
        return list(self.session.exec(statement).all())

    def find_confirmed_of_user(self, user_id: str) -> list[RegistroHoras]:
        """Solo horas confirmadas: lo que va a la constancia."""
        statement = (
            select(RegistroHoras)
            .join(Activity, RegistroHoras.activity_id == Activity.id)
            .where(
                RegistroHoras.user_id == user_id,
                RegistroHoras.estado == EstadoHoras.CONFIRMADA.value,
                RegistroHoras.deleted_date.is_(None),
                Activity.deleted_date.is_(None),
            )
            .order_by(Activity.date.asc(), RegistroHoras.jornada.asc())
            .options(selectinload(RegistroHoras.activity))
        )
        return list(self.session.exec(statement).all())

    def save_all(self, registros: list[RegistroHoras]) -> None:
        self.session.add_all(registros)
