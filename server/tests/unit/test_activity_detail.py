from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4
import pytest

from app.modules.activities.application.queries.get_activity_detail import (
    GetActivityDetailQuery,
    GetActivityDetailQueryHandler,
)
from app.modules.activities.application.use_cases.close_activity import (
    CloseActivityCommand,
    CloseActivityUseCase,
)
from app.modules.activities.application.use_cases.delete_activity import (
    DeleteActivityCommand,
    DeleteActivityUseCase,
)
from app.modules.activities.application.use_cases.reopen_activity import (
    ReopenActivityCommand,
    ReopenActivityUseCase,
)
from app.modules.activities.application.use_cases.publish_activity import (
    PublishActivityCommand,
    PublishActivityUseCase,
)
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.activities.domain.entities.activity_detail import ActivityDetail
from app.modules.participations.domain.entities.participation import (
    Participation,
    ParticipationStatus,
)
from app.shared.domain.exceptions import ForbiddenException, ValidationException


def test_activity_detail_coordinates_validation():
    with pytest.raises(ValueError, match="Tanto la latitud como la longitud"):
        ActivityDetail.create(
            activity_id=uuid4(),
            latitude=-17.38,
            longitude=None,
        )

    with pytest.raises(ValueError, match="latitud debe estar comprendida"):
        ActivityDetail.create(
            activity_id=uuid4(),
            latitude=95.0,
            longitude=-66.0,
        )

    with pytest.raises(ValueError, match="longitud debe estar comprendida"):
        ActivityDetail.create(
            activity_id=uuid4(),
            latitude=-17.0,
            longitude=185.0,
        )

    detail = ActivityDetail.create(
        activity_id=uuid4(),
        latitude=-17.3895,
        longitude=-66.1568,
        place="Plaza Principal 14 de Septiembre",
        address="Calle España y Heroínas",
        description="Jornada comunitaria de limpieza.",
    )
    assert detail.latitude == -17.3895
    assert detail.longitude == -66.1568
    assert detail.place == "Plaza Principal 14 de Septiembre"


def test_publish_activity_requires_future_date():
    activity_id = uuid4()
    owner_id = "user_owner"
    past_date = datetime.now(timezone.utc) - timedelta(days=1)

    past_activity = Activity(
        id=activity_id,
        name="Actividad Pasada",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=past_date,
        capacity=10,
        status=ActivityStatus.DRAFT,
    )
    detail = ActivityDetail.create(
        activity_id=activity_id,
        latitude=-17.38,
        longitude=-66.15,
        place="Cochabamba",
        address="Av. Heroínas",
        description="Descripción completa.",
    )

    repo = MagicMock()
    repo.get_detail_by_activity_id.return_value = (past_activity, detail)
    uow = MagicMock()

    use_case = PublishActivityUseCase(repo, uow)
    with pytest.raises(ValidationException, match="fecha futura válida"):
        use_case.execute(
            PublishActivityCommand(activity_id=activity_id, owner_id=owner_id)
        )


def test_publish_activity_requires_location_and_description():
    activity_id = uuid4()
    owner_id = "user_owner"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Actividad Sin Detalle",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.DRAFT,
    )

    repo = MagicMock()
    repo.get_detail_by_activity_id.return_value = (activity, None)
    uow = MagicMock()

    use_case = PublishActivityUseCase(repo, uow)
    with pytest.raises(ValidationException, match="ubicación en el mapa"):
        use_case.execute(
            PublishActivityCommand(activity_id=activity_id, owner_id=owner_id)
        )


def test_publish_activity_success():
    activity_id = uuid4()
    owner_id = "user_owner"
    future_date = datetime.now(timezone.utc) + timedelta(days=5)

    activity = Activity(
        id=activity_id,
        name="Reforestación Parque Tunari",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=20,
        status=ActivityStatus.DRAFT,
    )
    detail = ActivityDetail.create(
        activity_id=activity_id,
        latitude=-17.35,
        longitude=-66.18,
        place="Parque Tunari",
        address="Km 5 hacia el norte",
        description="Plantación de 200 arbolitos nativos.",
    )

    repo = MagicMock()
    repo.get_detail_by_activity_id.return_value = (activity, detail)
    uow = MagicMock()

    use_case = PublishActivityUseCase(repo, uow)
    result = use_case.execute(
        PublishActivityCommand(activity_id=activity_id, owner_id=owner_id)
    )

    assert result.status == ActivityStatus.ACTIVE
    repo.save.assert_called_once_with(activity)
    uow.commit.assert_called_once()


def test_close_activity_only_owner():
    activity_id = uuid4()
    owner_id = "user_owner"

    activity = Activity(
        id=activity_id,
        name="Actividad Activa",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=1),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    repo = MagicMock()
    repo.get_by_id.return_value = activity
    uow = MagicMock()

    use_case = CloseActivityUseCase(repo, uow)
    with pytest.raises(ForbiddenException):
        use_case.execute(
            CloseActivityCommand(activity_id=activity_id, owner_id="another_user")
        )

    result = use_case.execute(
        CloseActivityCommand(activity_id=activity_id, owner_id=owner_id)
    )
    assert result.status == ActivityStatus.CLOSED
    repo.save.assert_called_once_with(activity)
    uow.commit.assert_called_once()


def test_reopen_activity_future_success():
    activity_id = uuid4()
    owner_id = "user_owner"

    activity = Activity(
        id=activity_id,
        name="Actividad Cerrada Futura",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.CLOSED,
    )

    repo = MagicMock()
    repo.get_by_id.return_value = activity
    uow = MagicMock()

    use_case = ReopenActivityUseCase(repo, uow)
    result = use_case.execute(
        ReopenActivityCommand(activity_id=activity_id, owner_id=owner_id)
    )

    assert result.status == ActivityStatus.ACTIVE
    repo.save.assert_called_once_with(activity)
    uow.commit.assert_called_once()


def test_reopen_activity_past_rejected():
    activity_id = uuid4()
    owner_id = "user_owner"

    activity = Activity(
        id=activity_id,
        name="Actividad Cerrada Pasada",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) - timedelta(days=1),
        capacity=10,
        status=ActivityStatus.CLOSED,
    )

    repo = MagicMock()
    repo.get_by_id.return_value = activity
    uow = MagicMock()

    use_case = ReopenActivityUseCase(repo, uow)
    with pytest.raises(ValidationException, match="fecha ya ha transcurrido"):
        use_case.execute(
            ReopenActivityCommand(activity_id=activity_id, owner_id=owner_id)
        )


def test_delete_activity_success():
    activity_id = uuid4()
    owner_id = "user_owner"

    activity = Activity(
        id=activity_id,
        name="Actividad Sin Inscritos",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity

    part_repo = MagicMock()
    part_repo.list_participants_by_activity_id.return_value = []

    uow = MagicMock()

    use_case = DeleteActivityUseCase(act_repo, part_repo, uow)
    use_case.execute(DeleteActivityCommand(activity_id=activity_id, owner_id=owner_id))

    act_repo.delete.assert_called_once_with(activity)
    uow.commit.assert_called_once()


def test_delete_activity_with_participants_rejected():
    activity_id = uuid4()
    owner_id = "user_owner"

    activity = Activity(
        id=activity_id,
        name="Actividad Con Inscritos",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity

    part_repo = MagicMock()
    participation = Participation.create(activity_id=activity_id, user_id="user_2")
    part_repo.list_participants_by_activity_id.return_value = [
        (participation, "Ana Lopez", "https://avatar.com/ana.png")
    ]

    uow = MagicMock()

    use_case = DeleteActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ValidationException, match="participantes inscritos"):
        use_case.execute(
            DeleteActivityCommand(activity_id=activity_id, owner_id=owner_id)
        )


def test_get_activity_detail_with_participants():
    activity_id = uuid4()
    activity = Activity(
        id=activity_id,
        name="Taller de Reciclaje",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )
    detail = ActivityDetail.create(
        activity_id=activity_id,
        latitude=-17.38,
        longitude=-66.15,
        place="Parque",
        address="Calle 1",
        description="Detalle",
    )
    act_repo = MagicMock()
    act_repo.get_detail_by_activity_id.return_value = (activity, detail)

    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = Participation(
        id=uuid4(), activity_id=activity_id, user_id="user_2", status=ParticipationStatus.ACCEPTED
    )
    participation = Participation.create(activity_id=activity_id, user_id="user_2")
    part_repo.list_participants_by_activity_id.return_value = [
        (participation, "Ana Lopez", "https://avatar.com/ana.png")
    ]

    handler = GetActivityDetailQueryHandler(act_repo, part_repo)
    result = handler.execute(
        GetActivityDetailQuery(activity_id=activity_id, current_user_id="user_2")
    )

    assert result.id == activity_id
    assert result.is_owner is False
    assert result.is_participating is True
    assert len(result.participants) == 1
    assert result.participants[0].id == "user_2"
    assert result.participants[0].name == "Ana Lopez"
    assert result.participants[0].image == "https://avatar.com/ana.png"

    owner_result = handler.execute(
        GetActivityDetailQuery(activity_id=activity_id, current_user_id="owner_1")
    )
    assert owner_result.is_owner is True
