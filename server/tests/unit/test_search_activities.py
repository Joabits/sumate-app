from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

import app.shared.infrastructure.db.models
from app.modules.activities.application.queries.list_causes import CauseDTO
from app.modules.activities.application.queries.list_explore_activities import ActivityListDTO
from app.modules.activities.application.queries.search_activities import (
    SearchActivitiesQuery,
    SearchActivitiesQueryHandler,
)
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.activities.domain.entities.cause import Cause
from app.modules.activities.infrastructure.persistence.models.activity_cause_model import (
    ActivityCauseModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_detail_model import (
    ActivityDetailModel,
)
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)
from app.modules.activities.infrastructure.persistence.models.cause_model import CauseModel
from app.modules.activities.infrastructure.persistence.repositories.sqlmodel_activity_repository import (
    SQLModelActivityRepository,
)
from app.modules.participations.infrastructure.persistence.models.participation_model import (
    ParticipationModel,
)
from app.shared.infrastructure.db.better_auth import BetterAuthUser


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _sqlite_connect(dbapi_connection, connection_record):
        dbapi_connection.create_function("least", -1, min)
        dbapi_connection.create_function("greatest", -1, max)

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_search_handler_returns_matching_results():
    activity = Activity.create(
        name="Limpieza de Playa",
        owner_id="usr_123",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        creator_name="Carlos Ruiz",
        creator_image="https://example.com/carlos.jpg",
    )

    cause = Cause(
        id=activity.id,
        name="Medio Ambiente",
        slug="medio-ambiente",
    )

    repo = MagicMock()
    repo.search_activities.return_value = [activity]
    repo.get_causes_for_activities.return_value = {activity.id: [cause]}

    handler = SearchActivitiesQueryHandler(repo)
    result = handler.execute(
        SearchActivitiesQuery(
            query="playa",
            time_of_day="morning",
            date_preset="upcoming",
            capacity_range="10-20",
        )
    )

    assert isinstance(result, ActivityListDTO)
    assert len(result.items) == 1
    assert result.items[0].name == "Limpieza de Playa"
    assert result.items[0].creator_name == "Carlos Ruiz"
    assert result.items[0].creator_image == "https://example.com/carlos.jpg"
    assert len(result.items[0].causes) == 1
    assert result.items[0].causes[0].name == "Medio Ambiente"


def test_search_handler_returns_empty_when_no_matches():
    repo = MagicMock()
    repo.search_activities.return_value = []
    repo.get_causes_for_activities.return_value = {}

    handler = SearchActivitiesQueryHandler(repo)
    result = handler.execute(
        SearchActivitiesQuery(
            query="inexistente",
            time_of_day="night",
            date_preset="today",
            capacity_range="gt-20",
        )
    )

    assert isinstance(result, ActivityListDTO)
    assert len(result.items) == 0
    assert result.items == ()


def test_search_handler_passes_all_filter_parameters():
    cause_id = uuid4()
    repo = MagicMock()
    repo.search_activities.return_value = []
    repo.get_causes_for_activities.return_value = {}

    handler = SearchActivitiesQueryHandler(repo)
    query = SearchActivitiesQuery(
        query="parque",
        time_of_day="morning",
        date_preset="tomorrow",
        capacity_range="1-9",
        cause_ids=(cause_id,),
        user_latitude=-17.3895,
        user_longitude=-66.1568,
        max_distance_km=15.0,
    )
    handler.execute(query)

    repo.search_activities.assert_called_once()
    kwargs = repo.search_activities.call_args.kwargs
    assert kwargs["query"] == "parque"
    assert kwargs["time_of_day"] == "morning"
    assert kwargs["date_preset"] == "tomorrow"
    assert kwargs["capacity_range"] == "1-9"
    assert kwargs["cause_ids"] == (cause_id,)
    assert kwargs["user_latitude"] == -17.3895
    assert kwargs["user_longitude"] == -66.1568
    assert kwargs["max_distance_km"] == 15.0
    assert isinstance(kwargs["min_date"], datetime)


def test_search_repo_by_text_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    act = ActivityModel(
        id=uuid4(),
        name="Reforestación del Cerro San Pedro",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=20,
        status="active",
    )
    db_session.add(act)
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)
    now = datetime.now(timezone.utc)

    matching = repo.search_activities(query="Reforestación", min_date=now)
    assert len(matching) == 1
    assert matching[0].name == "Reforestación del Cerro San Pedro"

    partial_match = repo.search_activities(query="san pedro", min_date=now)
    assert len(partial_match) == 1

    no_match = repo.search_activities(query="Astronomía Marina", min_date=now)
    assert len(no_match) == 0


def test_search_repo_by_cause_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    cause_eco = CauseModel(id=uuid4(), name="Ecología", slug="ecologia")
    cause_salud = CauseModel(id=uuid4(), name="Salud", slug="salud")
    db_session.add_all([cause_eco, cause_salud])
    db_session.commit()

    act_id = uuid4()
    act = ActivityModel(
        id=act_id,
        name="Jornada Ecológica",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=15,
        status="active",
    )
    db_session.add(act)
    db_session.add(ActivityCauseModel(activity_id=act_id, cause_id=cause_eco.id))
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)
    now = datetime.now(timezone.utc)

    matching = repo.search_activities(cause_ids=(cause_eco.id,), min_date=now)
    assert len(matching) == 1
    assert matching[0].id == act_id

    no_match = repo.search_activities(cause_ids=(cause_salud.id,), min_date=now)
    assert len(no_match) == 0

    no_match_random = repo.search_activities(cause_ids=(uuid4(),), min_date=now)
    assert len(no_match_random) == 0


def test_search_repo_by_capacity_range_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    act_small = ActivityModel(
        id=uuid4(),
        name="Taller Reducido",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=5,
        status="active",
    )
    act_medium = ActivityModel(
        id=uuid4(),
        name="Taller Mediano",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=15,
        status="active",
    )
    act_large = ActivityModel(
        id=uuid4(),
        name="Feria Masiva",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=50,
        status="active",
    )
    db_session.add_all([act_small, act_medium, act_large])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)
    now = datetime.now(timezone.utc)

    res_1_9 = repo.search_activities(capacity_range="1-9", min_date=now)
    assert len(res_1_9) == 1
    assert res_1_9[0].name == "Taller Reducido"

    res_10_20 = repo.search_activities(capacity_range="10-20", min_date=now)
    assert len(res_10_20) == 1
    assert res_10_20[0].name == "Taller Mediano"

    res_gt_20 = repo.search_activities(capacity_range="gt-20", min_date=now)
    assert len(res_gt_20) == 1
    assert res_gt_20[0].name == "Feria Masiva"


def test_search_repo_by_date_preset_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    now = datetime.now(timezone.utc)
    now_bo = now.astimezone(ZoneInfo("America/La_Paz"))
    tomorrow_bo = (now_bo + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    next_month_bo = (now_bo + timedelta(days=30)).replace(hour=10, minute=0, second=0, microsecond=0)

    act_tomorrow = ActivityModel(
        id=uuid4(),
        name="Actividad Mañana",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=tomorrow_bo.astimezone(timezone.utc).replace(tzinfo=None),
        capacity=10,
        status="active",
    )
    act_next_month = ActivityModel(
        id=uuid4(),
        name="Actividad Próximo Mes",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=next_month_bo.astimezone(timezone.utc).replace(tzinfo=None),
        capacity=10,
        status="active",
    )
    db_session.add_all([act_tomorrow, act_next_month])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)

    res_tomorrow = repo.search_activities(date_preset="tomorrow", min_date=now)
    assert len(res_tomorrow) == 1
    assert res_tomorrow[0].name == "Actividad Mañana"

    res_today = repo.search_activities(date_preset="today", min_date=now)
    assert len(res_today) == 0


def test_search_repo_by_time_of_day_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    now = datetime.now(timezone.utc)
    now_bo = now.astimezone(ZoneInfo("America/La_Paz"))
    morning_bo = (now_bo + timedelta(days=2)).replace(hour=8, minute=0, second=0, microsecond=0)
    night_bo = (now_bo + timedelta(days=2)).replace(hour=21, minute=0, second=0, microsecond=0)

    act_morning = ActivityModel(
        id=uuid4(),
        name="Yoga Matutino",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=morning_bo.astimezone(timezone.utc).replace(tzinfo=None),
        capacity=10,
        status="active",
    )
    act_night = ActivityModel(
        id=uuid4(),
        name="Observación Nocturna",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=night_bo.astimezone(timezone.utc).replace(tzinfo=None),
        capacity=10,
        status="active",
    )
    db_session.add_all([act_morning, act_night])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)

    res_morning = repo.search_activities(time_of_day="morning", min_date=now)
    assert len(res_morning) == 1
    assert res_morning[0].name == "Yoga Matutino"

    res_night = repo.search_activities(time_of_day="night", min_date=now)
    assert len(res_night) == 1
    assert res_night[0].name == "Observación Nocturna"

    res_afternoon = repo.search_activities(time_of_day="afternoon", min_date=now)
    assert len(res_afternoon) == 0


def test_search_repo_by_distance_radius_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    now = datetime.now(timezone.utc)
    act_near_id = uuid4()
    act_near = ActivityModel(
        id=act_near_id,
        name="Actividad Cercana (Plaza Colón)",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=10,
        status="active",
    )
    detail_near = ActivityDetailModel(
        activity_id=act_near_id,
        latitude=-17.3895,
        longitude=-66.1568,
        place="Plaza Colón",
        address="Calle San Martín",
        description="Centro de la ciudad",
    )

    act_far_id = uuid4()
    act_far = ActivityModel(
        id=act_far_id,
        name="Actividad Lejana (Quillacollo)",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=10,
        status="active",
    )
    detail_far = ActivityDetailModel(
        activity_id=act_far_id,
        latitude=-17.4000,
        longitude=-66.2800,
        place="Quillacollo",
        address="Plaza Bolívar",
        description="A unos 13 km de distancia",
    )

    act_no_coords_id = uuid4()
    act_no_coords = ActivityModel(
        id=act_no_coords_id,
        name="Actividad Virtual Sin Coordenadas",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=10,
        status="active",
    )

    db_session.add_all([act_near, detail_near, act_far, detail_far, act_no_coords])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)

    res_5km = repo.search_activities(
        user_latitude=-17.3890,
        user_longitude=-66.1560,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(res_5km) == 1
    assert res_5km[0].id == act_near_id

    res_20km = repo.search_activities(
        user_latitude=-17.3890,
        user_longitude=-66.1560,
        max_distance_km=20.0,
        min_date=now,
    )
    assert len(res_20km) == 2
    act_ids_20km = {a.id for a in res_20km}
    assert act_near_id in act_ids_20km
    assert act_far_id in act_ids_20km
    assert act_no_coords_id not in act_ids_20km

    res_outside = repo.search_activities(
        user_latitude=-16.5000,
        user_longitude=-68.1500,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(res_outside) == 0


def test_search_repo_availability_rule_excludes_inactive_past_and_full(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    volunteer = BetterAuthUser(id="usr_2", name="Pedro", email="pedro@example.com")
    db_session.add_all([owner, volunteer])

    now = datetime.now(timezone.utc)

    act_valid = ActivityModel(
        id=uuid4(),
        name="Actividad Disponible y Abierta",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=5,
        status="active",
    )

    act_draft = ActivityModel(
        id=uuid4(),
        name="Actividad En Borrador",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=5,
        status="draft",
    )

    act_closed = ActivityModel(
        id=uuid4(),
        name="Actividad Convocatoria Cerrada",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=5,
        status="closed",
    )

    act_past = ActivityModel(
        id=uuid4(),
        name="Actividad Fecha Pasada",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now - timedelta(days=1),
        capacity=5,
        status="active",
    )

    act_full_id = uuid4()
    act_full = ActivityModel(
        id=act_full_id,
        name="Actividad Sin Cupos Disponibles",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=1,
        status="active",
    )
    part_full = ParticipationModel(activity_id=act_full_id, user_id="usr_2")

    db_session.add_all([act_valid, act_draft, act_closed, act_past, act_full, part_full])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)
    results = repo.search_activities(min_date=now)

    assert len(results) == 1
    assert results[0].id == act_valid.id
    assert results[0].name == "Actividad Disponible y Abierta"


def test_search_repo_combined_filters_matching_and_empty(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    cause_edu = CauseModel(id=uuid4(), name="Educación", slug="educacion")
    cause_arte = CauseModel(id=uuid4(), name="Arte", slug="arte")
    db_session.add_all([cause_edu, cause_arte])
    db_session.commit()

    now = datetime.now(timezone.utc)
    now_bo = now.astimezone(ZoneInfo("America/La_Paz"))
    tomorrow_morning_bo = (now_bo + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    tomorrow_morning = tomorrow_morning_bo.astimezone(timezone.utc).replace(tzinfo=None)
    act_target_id = uuid4()

    act_target = ActivityModel(
        id=act_target_id,
        name="Taller de Pintura y Dibujo",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=tomorrow_morning,
        capacity=15,
        status="active",
    )
    detail_target = ActivityDetailModel(
        activity_id=act_target_id,
        latitude=-17.3895,
        longitude=-66.1568,
        place="Centro Cultural",
        address="Calle Heroínas",
        description="Taller artístico",
    )
    db_session.add_all([
        act_target,
        detail_target,
        ActivityCauseModel(activity_id=act_target_id, cause_id=cause_arte.id),
    ])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)

    matching = repo.search_activities(
        query="Pintura",
        time_of_day="morning",
        date_preset="tomorrow",
        capacity_range="10-20",
        cause_ids=(cause_arte.id,),
        user_latitude=-17.3890,
        user_longitude=-66.1560,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(matching) == 1
    assert matching[0].id == act_target_id

    no_match_wrong_cause = repo.search_activities(
        query="Pintura",
        time_of_day="morning",
        date_preset="tomorrow",
        capacity_range="10-20",
        cause_ids=(cause_edu.id,),
        user_latitude=-17.3890,
        user_longitude=-66.1560,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(no_match_wrong_cause) == 0

    no_match_wrong_capacity = repo.search_activities(
        query="Pintura",
        time_of_day="morning",
        date_preset="tomorrow",
        capacity_range="1-9",
        cause_ids=(cause_arte.id,),
        user_latitude=-17.3890,
        user_longitude=-66.1560,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(no_match_wrong_capacity) == 0


def test_search_repo_by_text_matches_cause_and_place(db_session):
    owner = BetterAuthUser(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    cause = CauseModel(id=uuid4(), name="Medio Ambiente", slug="medio-ambiente")
    act_id = uuid4()
    act = ActivityModel(
        id=act_id,
        name="Jornada de Limpieza",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=10,
        status="active",
    )
    db_session.add_all([cause, act])
    db_session.commit()
    db_session.add_all([
        ActivityCauseModel(activity_id=act_id, cause_id=cause.id),
        ActivityDetailModel(
            activity_id=act_id,
            place="Plaza Colón",
            address="Av. Ballivián, Cochabamba",
        ),
    ])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)
    now = datetime.now(timezone.utc)

    assert len(repo.search_activities(query="ambiente", min_date=now)) == 1
    assert len(repo.search_activities(query="plaza col", min_date=now)) == 1
    assert len(repo.search_activities(query="ballivián", min_date=now)) == 1
    assert len(repo.search_activities(query="limpieza", min_date=now)) == 1
    assert len(repo.search_activities(query="salud", min_date=now)) == 0


def test_registered_counts_for_activities(db_session):
    act_with_people = uuid4()
    act_empty = uuid4()
    for act_id in (act_with_people, act_empty):
        db_session.add(
            ActivityModel(
                id=act_id,
                name="Actividad",
                owner_id="usr_1",
                image_url="http://localhost:8000/uploads/activities/test.webp",
                date=datetime.now(timezone.utc) + timedelta(days=2),
                capacity=10,
                status="active",
            )
        )
    db_session.commit()
    db_session.add_all([
        ParticipationModel(activity_id=act_with_people, user_id="usr_2"),
        ParticipationModel(activity_id=act_with_people, user_id="usr_3"),
    ])
    db_session.commit()

    repo = SQLModelActivityRepository(db_session)
    counts = repo.get_registered_counts_for_activities([act_with_people, act_empty])

    assert counts == {act_with_people: 2, act_empty: 0}
    assert repo.get_registered_counts_for_activities([]) == {}


def test_search_handler_includes_registered_count():
    activity = Activity.create(
        name="Feria Solidaria",
        owner_id="usr_123",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=3,
    )
    repo = MagicMock()
    repo.search_activities.return_value = [activity]
    repo.get_causes_for_activities.return_value = {}
    repo.get_registered_counts_for_activities.return_value = {activity.id: 1}

    handler = SearchActivitiesQueryHandler(repo)
    result = handler.execute(SearchActivitiesQuery(query="feria"))

    assert result.items[0].capacity == 3
    assert result.items[0].registered_count == 1
