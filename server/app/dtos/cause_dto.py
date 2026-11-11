from uuid import UUID

from sqlmodel import Field, SQLModel

from app.entities.cause import Cause


# ── Entrada ───────────────────────────────────────────────────────────────────
class ReplaceActivityCausesRequest(SQLModel):
    cause_ids: list[UUID] = Field(default_factory=list)


# ── Salida ────────────────────────────────────────────────────────────────────
class CauseRead(SQLModel):
    id: UUID
    name: str
    slug: str


class CauseListRead(SQLModel):
    items: list[CauseRead]


def to_cause(cause: Cause) -> CauseRead:
    return CauseRead(id=cause.id, name=cause.name, slug=cause.slug)


def to_causes(causes: list[Cause]) -> list[CauseRead]:
    return [to_cause(cause) for cause in causes]


def to_cause_list(causes: list[Cause]) -> CauseListRead:
    return CauseListRead(items=to_causes(causes))
