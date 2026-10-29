from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.participations.application.use_cases.join_activity import (
    JoinActivityCommand,
    JoinActivityUseCase,
)
from app.modules.participations.domain.entities.participation import (
    Participation,
    ParticipationStatus,
)
from app.modules.participations.domain.exceptions import (
    ActivityCapacityExceededException,
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
)


def test_join_activity_success():
    activity_id = uuid4()
    user_id = "volunteer_1"
    owner_id = "owner_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = None
    part_repo.count_by_activity_id.return_value = 5
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    participation = use_case.execute(
        JoinActivityCommand(activity_id=activity_id, user_id=user_id)
    )

    assert participation.activity_id == activity_id
    assert participation.user_id == user_id
    act_repo.get_by_id.assert_called_once_with(activity_id, for_update=True)
    part_repo.save.assert_called_once()
    uow.commit.assert_called_once()


def test_join_activity_last_remaining_spot_success():
    activity_id = uuid4()
    user_id = "volunteer_last"
    owner_id = "owner_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Último Cupo",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = None
    part_repo.count_by_activity_id.return_value = 9
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    participation = use_case.execute(
        JoinActivityCommand(activity_id=activity_id, user_id=user_id)
    )

    assert participation.activity_id == activity_id
    assert participation.user_id == user_id
    part_repo.save.assert_called_once()
    uow.commit.assert_called_once()


def test_join_activity_owner_cannot_join():
    activity_id = uuid4()
    owner_id = "owner_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(CannotJoinOwnActivityException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id=owner_id)
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_not_found_fails():
    activity_id = uuid4()
    act_repo = MagicMock()
    act_repo.get_by_id.return_value = None
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ActivityNotFoundException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id="volunteer_1")
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_closed_status_fails():
    activity_id = uuid4()
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.CLOSED,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(CannotJoinInactiveActivityException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id="volunteer_1")
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_draft_status_fails():
    activity_id = uuid4()
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.DRAFT,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(CannotJoinInactiveActivityException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id="volunteer_1")
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_past_activity_fails():
    activity_id = uuid4()
    past_date = datetime.now(timezone.utc) - timedelta(days=1)

    activity = Activity(
        id=activity_id,
        name="Taller Pasado",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=past_date,
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(CannotJoinPastActivityException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id="volunteer_1")
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_already_participating():
    activity_id = uuid4()
    user_id = "volunteer_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = Participation(
        id=uuid4(), activity_id=activity_id, user_id=user_id, status=ParticipationStatus.ACCEPTED
    )
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(AlreadyParticipatingException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id=user_id)
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_capacity_exceeded():
    activity_id = uuid4()
    user_id = "volunteer_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=5,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = None
    part_repo.count_by_activity_id.return_value = 5
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ActivityCapacityExceededException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id=user_id)
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_capacity_strictly_greater_than_max_fails():
    activity_id = uuid4()
    user_id = "volunteer_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Superpoblado",
        owner_id="owner_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=5,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = None
    part_repo.count_by_activity_id.return_value = 6
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(ActivityCapacityExceededException):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id=user_id)
        )

    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


def test_join_activity_rolls_back_if_part_repo_fails():
    activity_id = uuid4()
    user_id = "volunteer_1"
    owner_id = "owner_1"
    future_date = datetime.now(timezone.utc) + timedelta(days=2)

    activity = Activity(
        id=activity_id,
        name="Taller Comunitario",
        owner_id=owner_id,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=future_date,
        capacity=10,
        status=ActivityStatus.ACTIVE,
    )

    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = None
    part_repo.count_by_activity_id.return_value = 2
    part_repo.save.side_effect = RuntimeError("Database error")
    uow = MagicMock()

    use_case = JoinActivityUseCase(act_repo, part_repo, uow)
    with pytest.raises(RuntimeError, match="Database error"):
        use_case.execute(
            JoinActivityCommand(activity_id=activity_id, user_id=user_id)
        )

    uow.commit.assert_not_called()
