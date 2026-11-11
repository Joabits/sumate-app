from uuid import UUID

from sqlmodel import Session, select

from app.entities.activity_detail import ActivityDetail


class ActivityDetailRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_activity(self, activity_id: UUID) -> ActivityDetail | None:
        statement = select(ActivityDetail).where(ActivityDetail.activity_id == activity_id)
        return self.session.exec(statement).first()

    def save(self, detail: ActivityDetail) -> ActivityDetail:
        self.session.add(detail)
        return detail

    def delete(self, detail: ActivityDetail) -> None:
        self.session.delete(detail)
