from datetime import datetime, timezone
import pytest
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.shared.infrastructure.db.base_model import BaseModel


def test_activity_creation_defaults_to_draft():
    activity = Activity.create(
        name="Reforestación San Pedro",
        owner_id="usr_123",
        image_url="https://res.cloudinary.com/test.webp",
        date=datetime.now(timezone.utc),
        capacity=15,
    )
    assert activity.status == ActivityStatus.DRAFT
    assert activity.capacity == 15
    assert activity.name == "Reforestación San Pedro"


def test_activity_capacity_must_be_positive_integer():
    with pytest.raises(ValueError, match="mayor a cero"):
        Activity.create(
            name="Actividad Cero",
            owner_id="usr_123",
            image_url="https://res.cloudinary.com/test.webp",
            date=datetime.now(timezone.utc),
            capacity=0,
        )

    with pytest.raises(ValueError, match="mayor a cero"):
        Activity.create(
            name="Actividad Negativa",
            owner_id="usr_123",
            image_url="https://res.cloudinary.com/test.webp",
            date=datetime.now(timezone.utc),
            capacity=-5,
        )


def test_base_model_soft_delete_and_restore():
    model = BaseModel()
    assert model.deleted_date is None

    model.soft_delete()
    assert model.deleted_date is not None

    model.restore()
    assert model.deleted_date is None


def test_list_explore_activities_query_handler_propagates_creator_image():
    from unittest.mock import MagicMock
    from app.modules.activities.application.queries.list_explore_activities import (
        ListExploreActivitiesQuery,
        ListExploreActivitiesQueryHandler,
    )

    activity = Activity.create(
        name="Actividad Prueba",
        owner_id="usr_123",
        image_url="https://res.cloudinary.com/test.webp",
        date=datetime.now(timezone.utc),
        capacity=5,
        creator_name="Ana Pérez",
        creator_image="https://example.com/avatar.jpg",
    )

    repo = MagicMock()
    repo.list_explore.return_value = [activity]

    handler = ListExploreActivitiesQueryHandler(repo)
    result = handler.execute(ListExploreActivitiesQuery(current_user_id="usr_456"))

    assert len(result.items) == 1
    assert result.items[0].creator_name == "Ana Pérez"
    assert result.items[0].creator_image == "https://example.com/avatar.jpg"


def test_invalid_activity_capacity_exception():
    from app.modules.activities.domain.exceptions import InvalidActivityCapacityException
    from app.shared.domain.exceptions import ValidationException

    with pytest.raises(InvalidActivityCapacityException) as exc_info:
        Activity.create(
            name="Exceso de Plazas",
            owner_id="usr_123",
            image_url="https://res.cloudinary.com/test.webp",
            date=datetime.now(timezone.utc),
            capacity=10001,
        )
    assert isinstance(exc_info.value, ValidationException)
    assert isinstance(exc_info.value, ValueError)


def test_create_activity_request_as_form():
    from app.modules.activities.infrastructure.api.schemas.activity_schemas import (
        CreateActivityRequest,
    )

    req = CreateActivityRequest.as_form(
        name="Taller de Cocina",
        date="2026-12-01T15:30:00Z",
        capacity=20,
    )
    assert req.name == "Taller de Cocina"
    assert req.capacity == 20
    assert req.date.year == 2026
    assert req.date.tzinfo is not None



