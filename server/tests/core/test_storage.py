import pytest

from app.core.storage import delete_activity_image, save_activity_image


def test_save_and_delete_activity_image(uploads_dir):
    url = save_activity_image(b"imagen", filename="foto.png")
    name = url.rsplit("/", 1)[-1]

    assert url.startswith("http://localhost:8000/uploads/activities/")
    assert (uploads_dir / name).exists()

    delete_activity_image(url)
    assert not (uploads_dir / name).exists()


def test_save_activity_image_rejects_unknown_extension(uploads_dir):
    with pytest.raises(ValueError, match="Formato no permitido"):
        save_activity_image(b"texto", filename="archivo.txt")


def test_delete_activity_image_ignores_other_urls(uploads_dir):
    url = save_activity_image(b"imagen", filename="foto.jpg")
    name = url.rsplit("/", 1)[-1]

    # URLs de otros servicios o que intentan salir de la carpeta no borran nada
    delete_activity_image("https://res.cloudinary.com/demo/image/upload/foto.jpg")
    delete_activity_image(f"http://localhost:8000/uploads/activities/../../{name}x")
    delete_activity_image(None)
    delete_activity_image("")

    assert (uploads_dir / name).exists()
