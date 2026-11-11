from sqlmodel import Session

from app.dtos.cause_dto import CauseListRead, to_cause_list
from app.entities.cause import Cause
from app.repositories.cause_repository import CauseRepository


class CauseService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.causes = CauseRepository(session)

    def listar(self) -> CauseListRead:
        return to_cause_list(self.causes.find_all())

    def crear_si_no_existe(self, name: str, slug: str) -> Cause | None:
        """Agrega una causa al catálogo si su slug no existe. Lo usa la semilla."""
        if not isinstance(name, str) or not name.strip():
            raise ValueError("El nombre de la causa no puede estar vacío.")
        if not isinstance(slug, str) or not slug.strip():
            raise ValueError("El slug de la causa no puede estar vacío.")
        slug = slug.strip().lower()
        if self.causes.find_by_slug(slug) is not None:
            return None
        cause = self.causes.save(Cause(name=name.strip(), slug=slug))
        self.session.commit()
        return cause
