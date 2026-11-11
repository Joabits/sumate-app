from fastapi import APIRouter, Response, status

from app.core.database import DBSession
from app.core.security import CurrentUser
from app.models.evento import Evento
from app.views.analitica_view import AnaliticaRead, EventoRequest, render_analitica

router = APIRouter(tags=["Analítica"])


@router.post(
    "/eventos",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un evento de analítica (sin datos de la persona)",
)
def registrar_evento(
    payload: EventoRequest, current_user: CurrentUser, session: DBSession
) -> Response:
    # Pide sesión para que nadie de afuera llene la tabla, pero no guarda quién fue
    Evento.registrar(session, payload.evento, payload.props)
    session.commit()
    return Response(status_code=status.HTTP_201_CREATED)


@router.get(
    "/analitica",
    response_model=AnaliticaRead,
    summary="Embudo de la postulación: cuántos empiezan y cuántos terminan",
)
def analitica(current_user: CurrentUser, session: DBSession) -> AnaliticaRead:
    return render_analitica(Evento.contar_postulaciones(session), Evento.ultimos(session))
