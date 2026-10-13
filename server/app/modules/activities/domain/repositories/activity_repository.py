from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.domain.entities.activity_detail import ActivityDetail
from app.modules.activities.domain.entities.cause import Cause


class ActivityRepository(ABC):
    @abstractmethod
    def save(self, activity: Activity) -> None:
        ...

    @abstractmethod
    def get_by_id(
        self, activity_id: UUID, for_update: bool = False
    ) -> Activity | None:
        ...

    @abstractmethod
    def list_explore(
        self,
        *,
        exclude_owner_id: str,
        min_date: datetime,
    ) -> list[Activity]:
        ...

    @abstractmethod
    def search_activities(
        self,
        *,
        query: str | None = None,
        time_of_day: str | None = None,
        date_preset: str | None = None,
        capacity_range: str | None = None,
        cause_ids: tuple[UUID, ...] = (),
        user_latitude: float | None = None,
        user_longitude: float | None = None,
        max_distance_km: float | None = None,
        min_date: datetime,
    ) -> list[Activity]:
        ...

    @abstractmethod
    def list_my_activities(
        self,
        *,
        owner_id: str,
    ) -> list[tuple[Activity, int]]:
        ...

    @abstractmethod
    def save_detail(self, detail: ActivityDetail) -> None:
        ...

    @abstractmethod
    def get_detail_record(self, activity_id: UUID) -> ActivityDetail | None:
        ...

    @abstractmethod
    def get_detail_by_activity_id(
        self, activity_id: UUID
    ) -> tuple[Activity, ActivityDetail | None] | None:
        ...

    @abstractmethod
    def get_causes_by_activity_id(self, activity_id: UUID) -> list[Cause]:
        ...

    @abstractmethod
    def get_causes_for_activities(
        self, activity_ids: list[UUID]
    ) -> dict[UUID, list[Cause]]:
        ...

    @abstractmethod
    def replace_activity_causes(
        self, activity_id: UUID, cause_ids: list[UUID]
    ) -> None:
        ...

    @abstractmethod
    def delete(self, activity: Activity) -> None:
        ...
