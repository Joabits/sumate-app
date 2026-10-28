"""
app/core/integrations/local_storage.py

Guarda las imágenes de las actividades en una carpeta del servidor
(`uploads/activities`). FastAPI las sirve en /uploads (ver app/main.py).
"""

import logging
from pathlib import Path
from uuid import uuid4

from app.core.config import settings

logger = logging.getLogger(__name__)

ACTIVITIES_FOLDER = "activities"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def activities_dir() -> Path:
    folder = settings.uploads_path / ACTIVITIES_FOLDER
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def save_activity_image(content: bytes, filename: str | None = None) -> str:
    """
    Guarda la imagen con un nombre único y retorna la URL pública para mostrarla.
    """
    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Formato no permitido. Usa JPG, PNG, WEBP o GIF.")

    name = f"{uuid4().hex}{extension}"
    (activities_dir() / name).write_bytes(content)
    logger.info("Imagen de actividad guardada: %s", name)

    return f"{settings.PUBLIC_URL.rstrip('/')}/uploads/{ACTIVITIES_FOLDER}/{name}"


def delete_activity_image(image_url: str | None) -> None:
    """
    Borra del disco la imagen de una actividad a partir de su URL pública.
    Si la URL no es de esta carpeta (por ejemplo una imagen antigua de otro
    servicio) no hace nada.
    """
    prefix = f"{settings.PUBLIC_URL.rstrip('/')}/uploads/{ACTIVITIES_FOLDER}/"
    if not image_url or not image_url.startswith(prefix):
        return

    # Solo el nombre del archivo, para no salir de la carpeta
    name = Path(image_url[len(prefix):]).name
    if not name:
        return

    try:
        (activities_dir() / name).unlink(missing_ok=True)
        logger.info("Imagen de actividad eliminada: %s", name)
    except OSError as exc:
        logger.warning("No se pudo eliminar la imagen %s: %s", name, exc)
