from datetime import datetime
from uuid import UUID

from sqlmodel import Session, select

from app.entities.activity import Activity, ActivityStatus
from app.dtos.activity_dto import SearchFilters
from app.repositories.activity_search import build_search_statement


class ActivityRepository:
    """Consultas y guardado de actividades. No hace commit: eso lo decide el service."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, activity_id: UUID, *, for_update: bool = False) -> Activity | None:
        statement = select(Activity).where(
            Activity.id == activity_id, Activity.deleted_date.is_(None)
        )
        if for_update:
            # Bloquea la fila hasta el commit: dos peticiones no toman el mismo cupo a la vez
            statement = statement.with_for_update(of=Activity)
        return self.session.exec(statement).first()

    def find_explore(self, *, exclude_owner_id: str, min_date: datetime) -> list[Activity]:
        statement = (
            select(Activity)
            .where(
                Activity.deleted_date.is_(None),
                Activity.owner_id != exclude_owner_id,
                Activity.status == ActivityStatus.ACTIVE.value,
                Activity.date >= min_date,
            )
            .order_by(Activity.date.asc())
        )
        return list(self.session.exec(statement).all())

    def find_by_owner(self, owner_id: str) -> list[Activity]:
        statement = (
            select(Activity)
            .where(Activity.owner_id == owner_id, Activity.deleted_date.is_(None))
            .order_by(Activity.created_date.desc())
        )
        return list(self.session.exec(statement).all())

    def search(self, filters: SearchFilters, *, min_date: datetime) -> list[Activity]:
        return list(self.session.exec(build_search_statement(filters, min_date=min_date)).all())

    def save(self, activity: Activity) -> Activity:
        self.session.add(activity)
        return activity

    def delete(self, activity: Activity) -> None:
        self.session.delete(activity)
