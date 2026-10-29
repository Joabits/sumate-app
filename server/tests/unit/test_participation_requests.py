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
from app.modules.participations.application.use_cases.leave_activity import (
    LeaveActivityCommand,
    LeaveActivityUseCase,
)
from app.modules.participations.application.use_cases.review_participation_request import (
    AcceptParticipationRequestUseCase,
    RejectParticipationRequestUseCase,
    ReviewParticipationRequestCommand,
)
from app.modules.participations.domain.entities.participation import (
    Participation,
    ParticipationStatus,
)
from app.modules.participations.domain.exceptions import (
    ActivityCapacityExceededException,
    CannotJoinPastActivityException,
    NotActivityOrganizerException,
    ParticipationNotFoundException,
    RequestNotPendingException,
    RequestRejectedException,
)

OWNER_ID = "owner_1"
VOLUNTEER_ID = "volunteer_1"


def make_activity(*, days: int = 2, capacity: int = 10) -> Activity:
    return Activity(
        id=uuid4(),
        name="Taller Comunitario",
        owner_id=OWNER_ID,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=days),
        capacity=capacity,
        status=ActivityStatus.ACTIVE,
    )


def make_request(activity: Activity, status: ParticipationStatus) -> Participation:
    return Participation(
        id=uuid4(),
        activity_id=activity.id,
        user_id=VOLUNTEER_ID,
        status=status,
    )


def make_repos(activity: Activity | None, request: Participation | None, accepted: int = 0):
    act_repo = MagicMock()
    act_repo.get_by_id.return_value = activity
    part_repo = MagicMock()
    part_repo.get_by_activity_and_user.return_value = request
    part_repo.count_by_activity_id.return_value = accepted
    return act_repo, part_repo, MagicMock()


def review_command(activity: Activity, organizer_id: str = OWNER_ID):
    return ReviewParticipationRequestCommand(
        activity_id=activity.id,
        participant_id=VOLUNTEER_ID,
        organizer_id=organizer_id,
    )


# ── Entidad ───────────────────────────────────────────────────────────────────
def test_new_participation_starts_pending():
    participation = Participation.create(activity_id=uuid4(), user_id=VOLUNTEER_ID)
    assert participation.status == ParticipationStatus.PENDING


@pytest.mark.parametrize("status", [ParticipationStatus.ACCEPTED, ParticipationStatus.REJECTED])
def test_reviewed_request_cannot_be_reviewed_again(status):
    participation = Participation(
        id=uuid4(), activity_id=uuid4(), user_id=VOLUNTEER_ID, status=status
    )
    with pytest.raises(RequestNotPendingException):
        participation.accept()
    with pytest.raises(RequestNotPendingException):
        participation.reject()


# ── Solicitar ─────────────────────────────────────────────────────────────────
def test_join_creates_pending_request():
    activity = make_activity()
    act_repo, part_repo, uow = make_repos(activity, None)

    participation = JoinActivityUseCase(act_repo, part_repo, uow).execute(
        JoinActivityCommand(activity_id=activity.id, user_id=VOLUNTEER_ID)
    )

    assert participation.status == ParticipationStatus.PENDING
    part_repo.save.assert_called_once_with(participation)
    uow.commit.assert_called_once()


def test_rejected_user_cannot_request_again():
    activity = make_activity()
    rejected = make_request(activity, ParticipationStatus.REJECTED)
    act_repo, part_repo, uow = make_repos(activity, rejected)

    with pytest.raises(RequestRejectedException):
        JoinActivityUseCase(act_repo, part_repo, uow).execute(
            JoinActivityCommand(activity_id=activity.id, user_id=VOLUNTEER_ID)
        )
    part_repo.save.assert_not_called()


def test_rejected_user_cannot_delete_request_to_retry():
    activity = make_activity()
    rejected = make_request(activity, ParticipationStatus.REJECTED)
    act_repo, part_repo, uow = make_repos(activity, rejected)

    with pytest.raises(ParticipationNotFoundException):
        LeaveActivityUseCase(act_repo, part_repo, uow).execute(
            LeaveActivityCommand(activity_id=activity.id, user_id=VOLUNTEER_ID)
        )
    part_repo.delete.assert_not_called()


def test_pending_request_can_be_cancelled():
    activity = make_activity()
    pending = make_request(activity, ParticipationStatus.PENDING)
    act_repo, part_repo, uow = make_repos(activity, pending)
    part_repo.delete.return_value = True

    LeaveActivityUseCase(act_repo, part_repo, uow).execute(
        LeaveActivityCommand(activity_id=activity.id, user_id=VOLUNTEER_ID)
    )
    part_repo.delete.assert_called_once_with(activity.id, VOLUNTEER_ID)
    uow.commit.assert_called_once()


# ── Aceptar ───────────────────────────────────────────────────────────────────
def test_organizer_accepts_pending_request():
    activity = make_activity(capacity=3)
    pending = make_request(activity, ParticipationStatus.PENDING)
    act_repo, part_repo, uow = make_repos(activity, pending, accepted=2)

    result = AcceptParticipationRequestUseCase(act_repo, part_repo, uow).execute(
        review_command(activity)
    )

    assert result.status == ParticipationStatus.ACCEPTED
    act_repo.get_by_id.assert_called_once_with(activity.id, for_update=True)
    part_repo.save.assert_called_once_with(pending)
    uow.commit.assert_called_once()


def test_accept_fails_when_capacity_is_full():
    activity = make_activity(capacity=3)
    pending = make_request(activity, ParticipationStatus.PENDING)
    act_repo, part_repo, uow = make_repos(activity, pending, accepted=3)

    with pytest.raises(ActivityCapacityExceededException):
        AcceptParticipationRequestUseCase(act_repo, part_repo, uow).execute(
            review_command(activity)
        )
    assert pending.status == ParticipationStatus.PENDING
    uow.commit.assert_not_called()


def test_accept_fails_for_past_activity():
    activity = make_activity()
    activity.date = datetime.now(timezone.utc) - timedelta(days=1)
    pending = make_request(activity, ParticipationStatus.PENDING)
    act_repo, part_repo, uow = make_repos(activity, pending)

    with pytest.raises(CannotJoinPastActivityException):
        AcceptParticipationRequestUseCase(act_repo, part_repo, uow).execute(
            review_command(activity)
        )
    uow.commit.assert_not_called()


# ── Rechazar ──────────────────────────────────────────────────────────────────
def test_organizer_rejects_pending_request():
    activity = make_activity()
    pending = make_request(activity, ParticipationStatus.PENDING)
    act_repo, part_repo, uow = make_repos(activity, pending)

    result = RejectParticipationRequestUseCase(act_repo, part_repo, uow).execute(
        review_command(activity)
    )

    assert result.status == ParticipationStatus.REJECTED
    part_repo.save.assert_called_once_with(pending)
    uow.commit.assert_called_once()


# ── Permisos y errores comunes ────────────────────────────────────────────────
@pytest.mark.parametrize(
    "use_case_cls", [AcceptParticipationRequestUseCase, RejectParticipationRequestUseCase]
)
def test_only_organizer_can_review(use_case_cls):
    activity = make_activity()
    pending = make_request(activity, ParticipationStatus.PENDING)
    act_repo, part_repo, uow = make_repos(activity, pending)

    with pytest.raises(NotActivityOrganizerException):
        use_case_cls(act_repo, part_repo, uow).execute(
            review_command(activity, organizer_id="intruder")
        )
    part_repo.save.assert_not_called()
    uow.commit.assert_not_called()


@pytest.mark.parametrize(
    "use_case_cls", [AcceptParticipationRequestUseCase, RejectParticipationRequestUseCase]
)
def test_review_fails_when_request_does_not_exist(use_case_cls):
    activity = make_activity()
    act_repo, part_repo, uow = make_repos(activity, None)

    with pytest.raises(ParticipationNotFoundException):
        use_case_cls(act_repo, part_repo, uow).execute(review_command(activity))


@pytest.mark.parametrize(
    "use_case_cls", [AcceptParticipationRequestUseCase, RejectParticipationRequestUseCase]
)
def test_review_fails_when_activity_does_not_exist(use_case_cls):
    activity = make_activity()
    act_repo, part_repo, uow = make_repos(None, None)

    with pytest.raises(ActivityNotFoundException):
        use_case_cls(act_repo, part_repo, uow).execute(review_command(activity))


@pytest.mark.parametrize(
    "use_case_cls", [AcceptParticipationRequestUseCase, RejectParticipationRequestUseCase]
)
def test_already_reviewed_request_cannot_change(use_case_cls):
    activity = make_activity()
    accepted = make_request(activity, ParticipationStatus.ACCEPTED)
    act_repo, part_repo, uow = make_repos(activity, accepted, accepted=1)

    with pytest.raises(RequestNotPendingException):
        use_case_cls(act_repo, part_repo, uow).execute(review_command(activity))
    uow.commit.assert_not_called()
