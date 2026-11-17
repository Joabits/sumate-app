from fastapi import APIRouter

from app.core.dependencies import CuentaServiceDep
from app.core.security import CurrentUser
from app.dtos.cuenta_dto import CuentaEliminadaRead, MisDatosRead

router = APIRouter(prefix="/cuenta", tags=["Cuenta"])


@router.get(
    "/mis-datos",
    response_model=MisDatosRead,
    summary="Todo lo que la app guarda de la persona (para verlo y descargarlo)",
)
def mis_datos(current_user: CurrentUser, service: CuentaServiceDep) -> MisDatosRead:
    return service.mis_datos(current_user.user_id, current_user.email)


@router.delete(
    "",
    response_model=CuentaEliminadaRead,
    summary="Eliminar la cuenta con la regla de la app (409 si organiza actividades por terminar)",
)
def eliminar_cuenta(current_user: CurrentUser, service: CuentaServiceDep) -> CuentaEliminadaRead:
    return service.eliminar(current_user.user_id)
