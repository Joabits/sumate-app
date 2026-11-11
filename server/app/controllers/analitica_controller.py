from fastapi import APIRouter, Response, status

from app.core.dependencies import AnaliticaServiceDep
from app.core.security import CurrentUser
from app.dtos.analitica_dto import AnaliticaRead, EventoRequest

router = APIRouter(tags=["Analítica"])


@router.post(
    "/eventos",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un evento de analítica (sin datos de la persona)",
)
def registrar_evento(
    payload: EventoRequest, current_user: CurrentUser, service: AnaliticaServiceDep
) -> Response:
    # Pide sesión para que nadie de afuera llene la tabla, pero no guarda quién fue
    service.registrar(payload.evento, payload.props)
    return Response(status_code=status.HTTP_201_CREATED)


@router.get(
    "/analitica",
    response_model=AnaliticaRead,
    summary="Embudo de la postulación: cuántos empiezan y cuántos terminan",
)
def analitica(current_user: CurrentUser, service: AnaliticaServiceDep) -> AnaliticaRead:
    return service.resumen()
