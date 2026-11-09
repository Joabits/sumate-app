"""
Punto de entrada de la API (arquitectura MVC).

    app/models/       M  tablas, reglas de negocio y consultas
    app/views/        V  esquemas de entrada/salida y funciones render_*
    app/controllers/  C  endpoints: reciben la petición y devuelven la vista
    app/core/            configuración, base de datos, seguridad, errores e integraciones
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.controllers import (
    activity_controller,
    cause_controller,
    health_controller,
    horas_controller,
    participation_controller,
)
from app.core.config import settings
from app.core.database import init_db
from app.core.errors import setup_exception_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    - DEV  + SQLite   → crea las tablas automáticamente (rápido para prototipar).
    - DEV  + Postgres → se asume que Alembic ya corrió (`alembic upgrade head`).
    - PROD            → Alembic siempre. init_db() nunca se llama.
    """
    if settings.ENVIRONMENT == "DEV" and settings.is_sqlite:
        logger.info("DEV + SQLite — inicializando tablas con SQLModel...")
        init_db()
    else:
        logger.info(
            "Modo %s con %s — las migraciones deben ejecutarse con Alembic.",
            settings.ENVIRONMENT,
            "SQLite" if settings.is_sqlite else "PostgreSQL",
        )
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

setup_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Las imágenes de las actividades se guardan en una carpeta y se sirven en /uploads
settings.uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_path), name="uploads")

# ── Controladores ─────────────────────────────────────────────────────────────
app.include_router(health_controller.router)
# cause_controller va antes: /activities/causes no debe tomarse como /activities/{activity_id}
app.include_router(cause_controller.router, prefix="/api")
app.include_router(activity_controller.router, prefix="/api")
app.include_router(participation_controller.router, prefix="/api")
app.include_router(horas_controller.router, prefix="/api")
