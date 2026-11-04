from app.modules.activities.domain.entities.activity import Activity
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)


class ActivityMapper:
    @staticmethod
    def to_domain(
        model: ActivityModel,
        creator_name: str | None = None,
        creator_image: str | None = None,
    ) -> Activity:
        return Activity(
            id=model.id,
            name=model.name,
            owner_id=model.owner_id,
            image_url=model.image_url,
            date=model.date,
            capacity=model.capacity,
            status=model.status,
            creator_name=creator_name,
            creator_image=creator_image,
            motivo_cancelacion=model.motivo_cancelacion,
        )

    @staticmethod
    def to_model(entity: Activity) -> ActivityModel:
        return ActivityModel(
            id=entity.id,
            name=entity.name,
            owner_id=entity.owner_id,
            image_url=entity.image_url,
            date=entity.date,
            capacity=entity.capacity,
            status=entity.status.value if hasattr(entity.status, "value") else str(entity.status),
            motivo_cancelacion=entity.motivo_cancelacion,
        )
