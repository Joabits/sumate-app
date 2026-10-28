from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.domain.repositories.activity_repository import (
    ActivityRepository,
)
from app.shared.application.ports import UnitOfWork


@dataclass(slots=True)
class CreateActivityCommand:
    name: str
    owner_id: str
    image_url: str
    date: datetime
    capacity: int = 1


class CreateActivityUseCase:
    def __init__(self, activity_repository: ActivityRepository, uow: UnitOfWork) -> None:
        self.activity_repository = activity_repository
        self.uow = uow

    def execute(self, command: CreateActivityCommand) -> UUID:
        Activity.ensure_future_date(command.date)
        activity = Activity.create(
            name=command.name,
            owner_id=command.owner_id,
            image_url=command.image_url,
            date=command.date,
            capacity=command.capacity,
        )
        self.activity_repository.save(activity)
        self.uow.commit()
        return activity.id
