from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.modules.activities.application.use_cases.create_activity import (
    CreateActivityCommand,
    CreateActivityUseCase,
)
from app.modules.activities.application.use_cases.update_activity_info import (
    UpdateActivityInfoCommand,
    UpdateActivityInfoUseCase,
)
from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.domain.exceptions import InvalidActivityDateException


def test_create_activity_rejects_past_date():
    repo = MagicMock()
    uow = MagicMock()
    use_case = CreateActivityUseCase(repo, uow)

    with pytest.raises(InvalidActivityDateException, match="posterior a la fecha actual"):
        use_case.execute(
            CreateActivityCommand(
                name="Actividad Pasada",
                owner_id="usr_123",
                image_url="http://localhost:8000/uploads/activities/test.webp",
                date=datetime.now(timezone.utc) - timedelta(days=1),
                capacity=5,
            )
        )
    repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_create_activity_accepts_future_date():
    repo = MagicMock()
    uow = MagicMock()
    use_case = CreateActivityUseCase(repo, uow)

    use_case.execute(
        CreateActivityCommand(
            name="Actividad Futura",
            owner_id="usr_123",
            image_url="http://localhost:8000/uploads/activities/test.webp",
            date=datetime.now(timezone.utc) + timedelta(days=1),
            capacity=5,
        )
    )
    repo.save.assert_called_once()
    uow.commit.assert_called_once()


def test_update_activity_info_rejects_past_date():
    activity = Activity.create(
        name="Actividad",
        owner_id="usr_123",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=3),
        capacity=5,
    )
    repo = MagicMock()
    repo.get_by_id.return_value = activity
    uow = MagicMock()
    use_case = UpdateActivityInfoUseCase(repo, uow)

    with pytest.raises(InvalidActivityDateException):
        use_case.execute(
            UpdateActivityInfoCommand(
                activity_id=activity.id,
                owner_id="usr_123",
                date=datetime.now(timezone.utc) - timedelta(hours=2),
            )
        )
    uow.commit.assert_not_called()


def test_update_activity_info_only_title_still_works():
    activity = Activity.create(
        name="Actividad",
        owner_id="usr_123",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=3),
        capacity=5,
    )
    repo = MagicMock()
    repo.get_by_id.return_value = activity
    use_case = UpdateActivityInfoUseCase(repo, MagicMock())

    use_case.execute(
        UpdateActivityInfoCommand(
            activity_id=activity.id,
            owner_id="usr_123",
            name="Nuevo título",
        )
    )
    assert activity.name == "Nuevo título"


def test_ensure_future_date_accepts_naive_dates_as_utc():
    future_naive = (datetime.now(timezone.utc) + timedelta(hours=1)).replace(tzinfo=None)
    Activity.ensure_future_date(future_naive)

    past_naive = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(tzinfo=None)
    with pytest.raises(InvalidActivityDateException):
        Activity.ensure_future_date(past_naive)
