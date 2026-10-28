from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.core.config import settings
from app.core.integrations.local_storage import (
    delete_activity_image,
    save_activity_image,
)
from app.modules.activities.application.use_cases.delete_activity import (
    DeleteActivityCommand,
    DeleteActivityUseCase,
)
from app.modules.activities.application.use_cases.update_activity_image import (
    UpdateActivityImageCommand,
    UpdateActivityImageUseCase,
)
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus


@pytest.fixture
def uploads_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "PUBLIC_URL", "http://localhost:8000")
    return tmp_path / "activities"


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


def _activity(owner_id: str, image_url: str) -> Activity:
    return Activity(
        id=uuid4(),
        name="Actividad Con Imagen",
        owner_id=owner_id,
        image_url=image_url,
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.DRAFT,
    )


def test_update_activity_image_returns_previous_url():
    activity = _activity("owner_1", "http://localhost:8000/uploads/activities/vieja.webp")
    repo = MagicMock()
    repo.get_by_id.return_value = activity

    use_case = UpdateActivityImageUseCase(repo, MagicMock())
    previous = use_case.execute(
        UpdateActivityImageCommand(
            activity_id=activity.id,
            owner_id="owner_1",
            image_url="http://localhost:8000/uploads/activities/nueva.webp",
        )
    )

    assert previous == "http://localhost:8000/uploads/activities/vieja.webp"
    assert activity.image_url == "http://localhost:8000/uploads/activities/nueva.webp"


def test_delete_activity_returns_image_url():
    activity = _activity("owner_1", "http://localhost:8000/uploads/activities/borrar.webp")
    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.list_participants_by_activity_id.return_value = []

    use_case = DeleteActivityUseCase(act_repo, part_repo, MagicMock())
    image_url = use_case.execute(
        DeleteActivityCommand(activity_id=activity.id, owner_id="owner_1")
    )

    assert image_url == "http://localhost:8000/uploads/activities/borrar.webp"
