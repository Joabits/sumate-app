"""Configuración, errores de negocio, formulario de creación e imágenes."""

from datetime import timezone
from pathlib import Path

from app.core import storage
from app.core.config import settings
from app.dtos.activity_dto import CreateActivityRequest
from app.exceptions import AppException


def test_sin_uploads_dir_las_imagenes_van_a_server_uploads():
    config = settings.model_copy(update={"UPLOADS_DIR": ""})
    assert config.uploads_path == Path(storage.__file__).resolve().parents[2] / "uploads"


def test_un_error_de_negocio_puede_traer_su_propio_codigo():
    error = AppException("Algo pasó", code="MI_CODIGO")
    assert (error.code, error.message) == ("MI_CODIGO", "Algo pasó")
    assert str(error) == "[MI_CODIGO] Algo pasó"


def test_fecha_del_formulario_sin_zona_se_toma_como_utc():
    datos = CreateActivityRequest.as_form(name="Taller", date="2026-12-01T10:00:00", capacity=3)
    assert datos.date.tzinfo == timezone.utc


def test_borrar_imagen_sin_nombre_de_archivo_no_hace_nada(uploads_dir):
    storage.delete_activity_image(f"{settings.PUBLIC_URL}/uploads/activities/")


def test_si_no_se_puede_borrar_la_imagen_solo_queda_en_el_log(uploads_dir, monkeypatch, caplog):
    def sin_permiso(self, missing_ok=False):
        raise PermissionError("sin permiso")

    monkeypatch.setattr(Path, "unlink", sin_permiso)
    storage.delete_activity_image(f"{settings.PUBLIC_URL}/uploads/activities/foto.webp")
    assert "No se pudo eliminar la imagen foto.webp" in caplog.text
