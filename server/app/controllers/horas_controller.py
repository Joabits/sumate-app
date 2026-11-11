from uuid import UUID

from fastapi import APIRouter, Response, status

from app.core.dependencies import HorasServiceDep
from app.core.security import CurrentUser
from app.dtos.horas_dto import (
    ConstanciaRead,
    CorregirHorasRequest,
    HorasActividadRead,
    ReclamarHorasRequest,
    RegistrarJornadaRequest,
)

router = APIRouter(prefix="/horas", tags=["Horas de voluntariado"])


@router.get(
    "/constancia",
    response_model=ConstanciaRead,
    summary="Constancia del voluntario: solo horas confirmadas",
)
def constancia(current_user: CurrentUser, service: HorasServiceDep) -> ConstanciaRead:
    return service.constancia(current_user.user_id, current_user.email)


@router.get(
    "/actividades/{activity_id}",
    response_model=HorasActividadRead,
    summary="Horas de una actividad (organizador: todas; voluntario: las suyas)",
)
def horas_de_actividad(
    activity_id: UUID, current_user: CurrentUser, service: HorasServiceDep
) -> HorasActividadRead:
    return service.horas_de_actividad(activity_id, current_user.user_id)


@router.post(
    "/actividades/{activity_id}/jornadas",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar las horas de una jornada (solo organizador)",
)
def registrar_jornada(
    activity_id: UUID,
    payload: RegistrarJornadaRequest,
    current_user: CurrentUser,
    service: HorasServiceDep,
) -> Response:
    service.registrar_jornada(activity_id, current_user.user_id, payload)
    return Response(status_code=status.HTTP_201_CREATED)


@router.patch(
    "/{registro_id}",
    status_code=status.HTTP_200_OK,
    summary="Corregir las horas (solo organizador); vuelven a esperar aceptación",
)
def corregir_horas(
    registro_id: UUID,
    payload: CorregirHorasRequest,
    current_user: CurrentUser,
    service: HorasServiceDep,
) -> Response:
    service.corregir(registro_id, current_user.user_id, payload.horas)
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{registro_id}/aceptar",
    status_code=status.HTTP_200_OK,
    summary="El voluntario acepta sus horas",
)
def aceptar_horas(registro_id: UUID, current_user: CurrentUser, service: HorasServiceDep) -> Response:
    service.aceptar(registro_id, current_user.user_id)
    return Response(status_code=status.HTTP_200_OK)


@router.post(
    "/{registro_id}/reclamar",
    status_code=status.HTTP_200_OK,
    summary="El voluntario reclama sus horas con un motivo",
)
def reclamar_horas(
    registro_id: UUID,
    payload: ReclamarHorasRequest,
    current_user: CurrentUser,
    service: HorasServiceDep,
) -> Response:
    service.reclamar(registro_id, current_user.user_id, payload.motivo)
    return Response(status_code=status.HTTP_200_OK)
