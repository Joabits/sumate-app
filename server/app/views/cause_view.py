from uuid import UUID

from sqlmodel import Field, SQLModel

from app.models.cause import Cause


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


def render_cause(cause: Cause) -> CauseRead:
    return CauseRead(id=cause.id, name=cause.name, slug=cause.slug)


def render_causes(causes: list[Cause]) -> list[CauseRead]:
    return [render_cause(cause) for cause in causes]


def render_cause_list(causes: list[Cause]) -> CauseListRead:
    return CauseListRead(items=render_causes(causes))
