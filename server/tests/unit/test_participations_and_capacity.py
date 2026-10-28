from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.modules.activities.application.queries.list_explore_activities import (
    ListExploreActivitiesQuery,
    ListExploreActivitiesQueryHandler,
)
from app.modules.activities.application.use_cases.update_activity_capacity import (
    UpdateActivityCapacityCommand,
    UpdateActivityCapacityUseCase,
)
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.activities.domain.exceptions import (
    ActivityNotFoundException,
    CapacityLessThanRegisteredException,
)
from app.modules.participations.application.queries.list_user_participations import (
    ListUserParticipationsQuery,
    ListUserParticipationsQueryHandler,
)
from app.modules.participations.application.use_cases.leave_activity import (
    LeaveActivityCommand,
    LeaveActivityUseCase,
)
from app.modules.participations.domain.entities.participation import Participation
from app.modules.participations.domain.exceptions import (
    CannotLeavePastActivityException,
    ParticipationNotFoundException,
)
from app.shared.domain.exceptions import ForbiddenException


def test_leave_activity_success():
    activity_id = uuid4()
    user_id = "volunteer_1"

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )
    part_repo = MagicMock()
    part_repo.delete.return_value = True
    uow = MagicMock()

    use_case = LeaveActivityUseCase(act_repo, part_repo, uow)
    use_case.execute(
        LeaveActivityCommand(activity_id=activity_id, user_id=user_id)
    )

    part_repo.delete.assert_called_once_with(activity_id, user_id)
    uow.commit.assert_called_once()


def test_leave_activity_not_found():
    activity_id = uuid4()
    user_id = "volunteer_1"

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )
    part_repo = MagicMock()
    part_repo.delete.return_value = False
    uow = MagicMock()

    use_case = LeaveActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ParticipationNotFoundException):
        use_case.execute(
            LeaveActivityCommand(activity_id=activity_id, user_id=user_id)
        )


def test_leave_activity_activity_not_found():
    activity_id = uuid4()
    user_id = "volunteer_1"

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = None
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = LeaveActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ActivityNotFoundException):
        use_case.execute(
            LeaveActivityCommand(activity_id=activity_id, user_id=user_id)
        )


def test_leave_past_activity_forbidden():
    activity_id = uuid4()
    user_id = "volunteer_1"

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = Activity(
        id=activity_id,
        name="Taller Comunitario Pasado",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) - timedelta(days=1),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = LeaveActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(CannotLeavePastActivityException):
        use_case.execute(
            LeaveActivityCommand(activity_id=activity_id, user_id=user_id)
        )


def test_update_activity_capacity_success():
    activity_id = uuid4()
    owner_id = "owner_1"

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=3),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.count_by_activity_id.return_value = 4
    uow = MagicMock()

    use_case = UpdateActivityCapacityUseCase(act_repo, part_repo, uow)
    updated = use_case.execute(
        UpdateActivityCapacityCommand(
            activity_id=activity_id,
            owner_id=owner_id,
            capacity=6,
        )
    )

    assert updated.capacity == 6
    act_repo.get_by_id.assert_called_once_with(activity_id, for_update=True)
    act_repo.save.assert_called_once_with(activity)
    uow.commit.assert_called_once()


def test_update_activity_capacity_fails_if_below_registered():
    activity_id = uuid4()
    owner_id = "owner_1"

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=3),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.count_by_activity_id.return_value = 5
    uow = MagicMock()

    use_case = UpdateActivityCapacityUseCase(act_repo, part_repo, uow)
    with pytest.raises(CapacityLessThanRegisteredException) as exc_info:
        use_case.execute(
            UpdateActivityCapacityCommand(
                activity_id=activity_id,
                owner_id=owner_id,
                capacity=4,
            )
        )

    assert "5" in str(exc_info.value)


def test_update_activity_capacity_non_owner_forbidden():
    activity_id = uuid4()
    owner_id = "owner_1"

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=3),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = UpdateActivityCapacityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ForbiddenException):
        use_case.execute(
            UpdateActivityCapacityCommand(
                activity_id=activity_id,
                owner_id="intruder",
                capacity=15,
            )
        )


def test_list_explore_activities_query_handler():
    act_repo = MagicMock()
    activity = Activity(
        id=uuid4(),
        name="Actividad Futura",
        owner_id="other_user",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=1),
        capacity=8,
        status=ActivityStatus.ACTIVE,
    )
    act_repo.list_explore.return_value = [activity]

    handler = ListExploreActivitiesQueryHandler(act_repo)
    result = handler.execute(
        ListExploreActivitiesQuery(current_user_id="me_user")
    )

    assert len(result.items) == 1
    assert result.items[0].name == "Actividad Futura"
    assert act_repo.list_explore.call_count == 1
    assert act_repo.list_explore.call_args.kwargs["exclude_owner_id"] == "me_user"


def test_list_user_participations_query_handler():
    part_repo = MagicMock()
    act_id = uuid4()
    activity = Activity(
        id=act_id,
        name="Plantar Arboles",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )
    participation = Participation.create(activity_id=act_id, user_id="user_1")
    enrolled_date = datetime.now(timezone.utc)
    part_repo.list_user_participated_activities.return_value = [
        (participation, activity, enrolled_date, "Carlos Creador", "https://img.com/carlos.jpg")
    ]

    handler = ListUserParticipationsQueryHandler(part_repo)
    result = handler.execute(ListUserParticipationsQuery(user_id="user_1"))

    assert len(result.items) == 1
    assert result.items[0].id == act_id
    assert result.items[0].name == "Plantar Arboles"
    assert result.items[0].creator_name == "Carlos Creador"
    assert result.items[0].creator_image == "https://img.com/carlos.jpg"
    assert result.items[0].enrolled_date == enrolled_date
    assert result.items[0].is_past is False
