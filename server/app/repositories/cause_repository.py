from uuid import UUID

from sqlmodel import Session, select

from app.entities.cause import ActivityCause, Cause


class CauseRepository:
    """Catálogo de causas y las causas de cada actividad."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def find_all(self) -> list[Cause]:
        statement = select(Cause).where(Cause.deleted_date.is_(None)).order_by(Cause.name.asc())
        return list(self.session.exec(statement).all())

    def find_by_slug(self, slug: str) -> Cause | None:
        statement = select(Cause).where(Cause.slug == slug, Cause.deleted_date.is_(None))
        return self.session.exec(statement).first()

    def find_by_ids(self, cause_ids: list[UUID]) -> list[Cause]:
        if not cause_ids:
            return []
        statement = select(Cause).where(Cause.id.in_(cause_ids), Cause.deleted_date.is_(None))
        return list(self.session.exec(statement).all())

    def find_by_activity(self, activity_id: UUID) -> list[Cause]:
        return self.find_by_activities([activity_id])[activity_id]

    def find_by_activities(self, activity_ids: list[UUID]) -> dict[UUID, list[Cause]]:
        """Causas de cada actividad, ordenadas por nombre."""
        result: dict[UUID, list[Cause]] = {activity_id: [] for activity_id in activity_ids}
        if not activity_ids:
            return result
        statement = (
            select(ActivityCause.activity_id, Cause)
            .join(Cause, ActivityCause.cause_id == Cause.id)
            .where(
                ActivityCause.activity_id.in_(activity_ids),
                ActivityCause.deleted_date.is_(None),
                Cause.deleted_date.is_(None),
            )
            .order_by(Cause.name.asc())
        )
        for activity_id, cause in self.session.exec(statement).all():
            result[activity_id].append(cause)
        return result

    def save(self, cause: Cause) -> Cause:
        self.session.add(cause)
        return cause

    def delete_links_of_activity(self, activity_id: UUID) -> None:
        statement = select(ActivityCause).where(ActivityCause.activity_id == activity_id)
        for link in self.session.exec(statement).all():
            self.session.delete(link)
        # Se borran antes de insertar las nuevas para no chocar con la restricción única
        self.session.flush()

    def replace_links_of_activity(self, activity_id: UUID, cause_ids: list[UUID]) -> None:
        self.delete_links_of_activity(activity_id)
        for cause_id in cause_ids:
            self.session.add(ActivityCause(activity_id=activity_id, cause_id=cause_id))
