import logging

from app.core.integrations.local_storage import delete_activity_image, save_activity_image
from app.modules.activities.domain.exceptions import InvalidActivityImageException
from fastapi import UploadFile

logger = logging.getLogger(__name__)

MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024


class ImageStorageService:
    @staticmethod
    async def upload_activity_cover(image: UploadFile) -> str:
        content = await image.read()
        if not content:
            raise InvalidActivityImageException("El archivo de imagen no puede estar vacío.")

        if len(content) > MAX_IMAGE_SIZE_BYTES:
            raise InvalidActivityImageException("La imagen no debe superar los 2MB.")

        try:
            return save_activity_image(content, filename=image.filename)
        except ValueError as exc:
            raise InvalidActivityImageException(str(exc))
        except OSError as exc:
            logger.error("Error al guardar la imagen en el servidor: %s", exc)
            raise InvalidActivityImageException("No se pudo guardar la imagen en el servidor.")

    @staticmethod
    def delete_activity_cover(image_url: str | None) -> None:
        delete_activity_image(image_url)
