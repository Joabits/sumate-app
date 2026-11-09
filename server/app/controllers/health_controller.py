import logging

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["System"])


@router.get("/health", summary="Verificar estado del sistema y BD")
def health_check():
    """
    Comprueba el estado de la API y la conectividad real con la base de datos.
    Devuelve 200 si todo está saludable, o 503 si la BD no responde.
    """
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("Healthcheck: fallo al conectar con la base de datos: %s", exc)
        db_status = "unreachable"

    payload = {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": {
            "engine": "SQLite" if settings.is_sqlite else "PostgreSQL",
            "status": db_status,
        },
        "environment": settings.ENVIRONMENT,
    }
    if db_status != "connected":
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)
    return payload
