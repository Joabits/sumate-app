from uuid import UUID

from sqlmodel import Field, Session, UniqueConstraint, select

from app.models.base import BaseModel


class Cause(BaseModel, table=True):
    """Causa temática del catálogo (Salud, Animales, Educación...)."""

    __tablename__ = "causes"

    name: str = Field(unique=True, index=True, nullable=False)
    slug: str = Field(unique=True, index=True, nullable=False)

    @classmethod
    def create(cls, *, name: str, slug: str) -> "Cause":
        if not isinstance(name, str) or not name.strip():
            raise ValueError("El nombre de la causa no puede estar vacío.")
        if not isinstance(slug, str) or not slug.strip():
            raise ValueError("El slug de la causa no puede estar vacío.")
        return cls(name=name.strip(), slug=slug.strip().lower())

    @property
    def is_active(self) -> bool:
        return self.deleted_date is None

    # ── Consultas ─────────────────────────────────────────────────────────────
    @classmethod
    def list_all(cls, session: Session) -> list["Cause"]:
        statement = select(cls).where(cls.deleted_date.is_(None)).order_by(cls.name.asc())
        return list(session.exec(statement).all())

    @classmethod
    def get_by_slug(cls, session: Session, slug: str) -> "Cause | None":
        statement = select(cls).where(cls.slug == slug, cls.deleted_date.is_(None))
        return session.exec(statement).first()

    @classmethod
    def get_by_ids(cls, session: Session, cause_ids: list[UUID]) -> list["Cause"]:
        if not cause_ids:
            return []
        statement = select(cls).where(cls.id.in_(cause_ids), cls.deleted_date.is_(None))
        return list(session.exec(statement).all())

    @classmethod
    def of_activity(cls, session: Session, activity_id: UUID) -> list["Cause"]:
        return cls.of_activities(session, [activity_id])[activity_id]

    @classmethod
    def of_activities(
        cls, session: Session, activity_ids: list[UUID]
    ) -> dict[UUID, list["Cause"]]:
        """Causas de cada actividad, ordenadas por nombre."""
        result: dict[UUID, list[Cause]] = {activity_id: [] for activity_id in activity_ids}
        if not activity_ids:
            return result
        statement = (
            select(ActivityCause.activity_id, cls)
            .join(cls, ActivityCause.cause_id == cls.id)
            .where(
                ActivityCause.activity_id.in_(activity_ids),
                ActivityCause.deleted_date.is_(None),
                cls.deleted_date.is_(None),
            )
            .order_by(cls.name.asc())
        )
        for activity_id, cause in session.exec(statement).all():
            result[activity_id].append(cause)
        return result


class ActivityCause(BaseModel, table=True):
    """Relación entre una actividad y sus causas."""

    __tablename__ = "activity_causes"
    __table_args__ = (
        UniqueConstraint("activity_id", "cause_id", name="uq_activity_causes_activity_cause"),
    )

    activity_id: UUID = Field(foreign_key="activity.id", index=True, nullable=False)
    cause_id: UUID = Field(foreign_key="causes.id", index=True, nullable=False)

    @classmethod
    def remove_from_activity(cls, session: Session, activity_id: UUID) -> None:
        statement = select(cls).where(cls.activity_id == activity_id)
        for record in session.exec(statement).all():
            session.delete(record)
        # Se borran antes de insertar las nuevas para no chocar con la restricción única
        session.flush()

    @classmethod
    def replace(cls, session: Session, activity_id: UUID, cause_ids: list[UUID]) -> None:
        cls.remove_from_activity(session, activity_id)
        for cause_id in cause_ids:
            session.add(cls(activity_id=activity_id, cause_id=cause_id))
