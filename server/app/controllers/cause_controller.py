from fastapi import APIRouter

from app.core.dependencies import CauseServiceDep
from app.dtos.cause_dto import CauseListRead

# Comparte el prefijo /activities: se registra antes que activity_controller
# para que /activities/causes no se confunda con /activities/{activity_id}
router = APIRouter(prefix="/activities", tags=["Actividades"])


@router.get("/causes", response_model=CauseListRead, summary="Listar catálogo de causas temáticas")
def list_causes(service: CauseServiceDep) -> CauseListRead:
    return service.listar()
