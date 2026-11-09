from fastapi import APIRouter

from app.core.database import DBSession
from app.models.cause import Cause
from app.views.cause_view import CauseListRead, render_cause_list

# Comparte el prefijo /activities: se registra antes que activity_controller
# para que /activities/causes no se confunda con /activities/{activity_id}
router = APIRouter(prefix="/activities", tags=["Actividades"])


@router.get("/causes", response_model=CauseListRead, summary="Listar catálogo de causas temáticas")
def list_causes(session: DBSession) -> CauseListRead:
    return render_cause_list(Cause.list_all(session))
