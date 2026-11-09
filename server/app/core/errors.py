"""
Manejo centralizado de errores.

Todas las respuestas de error tienen la misma forma:
    {"error": {"code": "...", "message": "..."}}
"""

import logging
from collections.abc import Mapping

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.models.exceptions import (
    AppException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)

logger = logging.getLogger(__name__)


class APIHTTPException(HTTPException):
    """Excepción HTTP con un código de error estable para los clientes de la API."""

    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        self.code = code
        super().__init__(
            status_code=status_code,
            detail=message,
            headers=dict(headers) if headers is not None else None,
        )


def format_error(code: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "message": message}}


# Estado HTTP de cada familia de errores de negocio (de la más específica a la más general)
_STATUS_BY_EXCEPTION: tuple[tuple[type[AppException], int], ...] = (
    (ForbiddenException, 403),
    (NotFoundException, 404),
    (ConflictException, 409),
    (ValidationException, 400),
    (AppException, 400),
)


def setup_exception_handlers(app: FastAPI) -> None:
    # ── 1. Errores de negocio de los modelos ──────────────────────────────────
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        status_code = next(
            status for exc_type, status in _STATUS_BY_EXCEPTION if isinstance(exc, exc_type)
        )
        return JSONResponse(status_code=status_code, content=format_error(exc.code, exc.message))

    # ── 2. Errores de validación del request (Pydantic) ───────────────────────
    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(request: Request, exc: RequestValidationError):
        error = exc.errors()[0]
        campo = ".".join(str(loc) for loc in error["loc"])
        return JSONResponse(
            status_code=422,
            content=format_error("SCHEMA_VALIDATION_ERROR", f"Error en '{campo}': {error['msg']}"),
        )

    # ── 3. Errores HTTP (401, 403, rutas 404 no definidas...) ─────────────────
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=format_error(
                getattr(exc, "code", f"HTTP_ERROR_{exc.status_code}"),
                str(exc.detail),
            ),
            headers=exc.headers,
        )

    # ── 4. Paracaídas final (errores 500 no capturados) ───────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=format_error(
                "INTERNAL_SERVER_ERROR", "Ha ocurrido un error interno del servidor."
            ),
        )
