"""Búsqueda con filtros contra una base SQLite en memoria."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from app.models import Activity, ActivityCause, ActivityDetail, Cause, Participation, User
from app.models.activity_search import SearchFilters, search_activities


def buscar(session, *, min_date, **filtros):
    return search_activities(session, SearchFilters(**filtros), min_date=min_date)


def test_search_by_text_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    act = Activity(
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

    now = datetime.now(timezone.utc)

    matching = buscar(db_session, query="Reforestación", min_date=now)
    assert len(matching) == 1
    assert matching[0].name == "Reforestación del Cerro San Pedro"

    partial_match = buscar(db_session, query="san pedro", min_date=now)
    assert len(partial_match) == 1

    no_match = buscar(db_session, query="Astronomía Marina", min_date=now)
    assert len(no_match) == 0


def test_search_by_cause_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    cause_eco = Cause(id=uuid4(), name="Ecología", slug="ecologia")
    cause_salud = Cause(id=uuid4(), name="Salud", slug="salud")
    db_session.add_all([cause_eco, cause_salud])
    db_session.commit()

    act_id = uuid4()
    act = Activity(
        id=act_id,
        name="Jornada Ecológica",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=15,
        status="active",
    )
    db_session.add(act)
    db_session.add(ActivityCause(activity_id=act_id, cause_id=cause_eco.id))
    db_session.commit()

    now = datetime.now(timezone.utc)

    matching = buscar(db_session, cause_ids=(cause_eco.id,), min_date=now)
    assert len(matching) == 1
    assert matching[0].id == act_id

    no_match = buscar(db_session, cause_ids=(cause_salud.id,), min_date=now)
    assert len(no_match) == 0

    no_match_random = buscar(db_session, cause_ids=(uuid4(),), min_date=now)
    assert len(no_match_random) == 0


def test_search_by_capacity_range_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    act_small = Activity(
        id=uuid4(),
        name="Taller Reducido",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=5,
        status="active",
    )
    act_medium = Activity(
        id=uuid4(),
        name="Taller Mediano",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=2),
        capacity=15,
        status="active",
    )
    act_large = Activity(
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

    now = datetime.now(timezone.utc)

    res_1_9 = buscar(db_session, capacity_range="1-9", min_date=now)
    assert len(res_1_9) == 1
    assert res_1_9[0].name == "Taller Reducido"

    res_10_20 = buscar(db_session, capacity_range="10-20", min_date=now)
    assert len(res_10_20) == 1
    assert res_10_20[0].name == "Taller Mediano"

    res_gt_20 = buscar(db_session, capacity_range="gt-20", min_date=now)
    assert len(res_gt_20) == 1
    assert res_gt_20[0].name == "Feria Masiva"


def test_search_by_date_preset_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    now = datetime.now(timezone.utc)
    now_bo = now.astimezone(ZoneInfo("America/La_Paz"))
    tomorrow_bo = (now_bo + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    next_month_bo = (now_bo + timedelta(days=30)).replace(hour=10, minute=0, second=0, microsecond=0)

    act_tomorrow = Activity(
        id=uuid4(),
        name="Actividad Mañana",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=tomorrow_bo.astimezone(timezone.utc).replace(tzinfo=None),
        capacity=10,
        status="active",
    )
    act_next_month = Activity(
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


    res_tomorrow = buscar(db_session, date_preset="tomorrow", min_date=now)
    assert len(res_tomorrow) == 1
    assert res_tomorrow[0].name == "Actividad Mañana"

    res_today = buscar(db_session, date_preset="today", min_date=now)
    assert len(res_today) == 0


def test_search_by_time_of_day_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    now = datetime.now(timezone.utc)
    now_bo = now.astimezone(ZoneInfo("America/La_Paz"))
    morning_bo = (now_bo + timedelta(days=2)).replace(hour=8, minute=0, second=0, microsecond=0)
    night_bo = (now_bo + timedelta(days=2)).replace(hour=21, minute=0, second=0, microsecond=0)

    act_morning = Activity(
        id=uuid4(),
        name="Yoga Matutino",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=morning_bo.astimezone(timezone.utc).replace(tzinfo=None),
        capacity=10,
        status="active",
    )
    act_night = Activity(
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


    res_morning = buscar(db_session, time_of_day="morning", min_date=now)
    assert len(res_morning) == 1
    assert res_morning[0].name == "Yoga Matutino"

    res_night = buscar(db_session, time_of_day="night", min_date=now)
    assert len(res_night) == 1
    assert res_night[0].name == "Observación Nocturna"

    res_afternoon = buscar(db_session, time_of_day="afternoon", min_date=now)
    assert len(res_afternoon) == 0


def test_search_by_distance_radius_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    now = datetime.now(timezone.utc)
    act_near_id = uuid4()
    act_near = Activity(
        id=act_near_id,
        name="Actividad Cercana (Plaza Colón)",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=10,
        status="active",
    )
    detail_near = ActivityDetail(
        activity_id=act_near_id,
        latitude=-17.3895,
        longitude=-66.1568,
        place="Plaza Colón",
        address="Calle San Martín",
        description="Centro de la ciudad",
    )

    act_far_id = uuid4()
    act_far = Activity(
        id=act_far_id,
        name="Actividad Lejana (Quillacollo)",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=10,
        status="active",
    )
    detail_far = ActivityDetail(
        activity_id=act_far_id,
        latitude=-17.4000,
        longitude=-66.2800,
        place="Quillacollo",
        address="Plaza Bolívar",
        description="A unos 13 km de distancia",
    )

    act_no_coords_id = uuid4()
    act_no_coords = Activity(
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


    res_5km = buscar(db_session, 
        user_latitude=-17.3890,
        user_longitude=-66.1560,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(res_5km) == 1
    assert res_5km[0].id == act_near_id

    res_20km = buscar(db_session, 
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

    res_outside = buscar(db_session, 
        user_latitude=-16.5000,
        user_longitude=-68.1500,
        max_distance_km=5.0,
        min_date=now,
    )
    assert len(res_outside) == 0


def test_search_excludes_inactive_and_past_but_keeps_full_for_waitlist(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    volunteer = User(id="usr_2", name="Pedro", email="pedro@example.com")
    db_session.add_all([owner, volunteer])

    now = datetime.now(timezone.utc)

    act_valid = Activity(
        id=uuid4(),
        name="Actividad Disponible y Abierta",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=5,
        status="active",
    )

    act_draft = Activity(
        id=uuid4(),
        name="Actividad En Borrador",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=5,
        status="draft",
    )

    act_closed = Activity(
        id=uuid4(),
        name="Actividad Convocatoria Cerrada",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=5,
        status="closed",
    )

    act_past = Activity(
        id=uuid4(),
        name="Actividad Fecha Pasada",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now - timedelta(days=1),
        capacity=5,
        status="active",
    )

    act_full_id = uuid4()
    act_full = Activity(
        id=act_full_id,
        name="Actividad Sin Cupos Disponibles",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=now + timedelta(days=2),
        capacity=1,
        status="active",
    )
    part_full = Participation(activity_id=act_full_id, user_id="usr_2", status="aceptada")

    db_session.add_all([act_valid, act_draft, act_closed, act_past, act_full, part_full])
    db_session.commit()

    results = buscar(db_session, min_date=now)

    # La actividad llena sigue apareciendo para que se pueda entrar a su lista de espera
    assert {r.id for r in results} == {act_valid.id, act_full_id}


def test_search_combined_filters_matching_and_empty(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    cause_edu = Cause(id=uuid4(), name="Educación", slug="educacion")
    cause_arte = Cause(id=uuid4(), name="Arte", slug="arte")
    db_session.add_all([cause_edu, cause_arte])
    db_session.commit()

    now = datetime.now(timezone.utc)
    now_bo = now.astimezone(ZoneInfo("America/La_Paz"))
    tomorrow_morning_bo = (now_bo + timedelta(days=1)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    tomorrow_morning = tomorrow_morning_bo.astimezone(timezone.utc).replace(tzinfo=None)
    act_target_id = uuid4()

    act_target = Activity(
        id=act_target_id,
        name="Taller de Pintura y Dibujo",
        owner_id="usr_1",
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=tomorrow_morning,
        capacity=15,
        status="active",
    )
    detail_target = ActivityDetail(
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
        ActivityCause(activity_id=act_target_id, cause_id=cause_arte.id),
    ])
    db_session.commit()


    matching = buscar(db_session, 
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

    no_match_wrong_cause = buscar(db_session, 
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

    no_match_wrong_capacity = buscar(db_session, 
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


def test_search_by_text_matches_cause_and_place(db_session):
    owner = User(id="usr_1", name="María Gómez", email="maria@example.com")
    db_session.add(owner)

    cause = Cause(id=uuid4(), name="Medio Ambiente", slug="medio-ambiente")
    act_id = uuid4()
    act = Activity(
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
        ActivityCause(activity_id=act_id, cause_id=cause.id),
        ActivityDetail(
            activity_id=act_id,
            place="Plaza Colón",
            address="Av. Ballivián, Cochabamba",
        ),
    ])
    db_session.commit()

    now = datetime.now(timezone.utc)

    assert len(buscar(db_session, query="ambiente", min_date=now)) == 1
    assert len(buscar(db_session, query="plaza col", min_date=now)) == 1
    assert len(buscar(db_session, query="ballivián", min_date=now)) == 1
    assert len(buscar(db_session, query="limpieza", min_date=now)) == 1
    assert len(buscar(db_session, query="salud", min_date=now)) == 0


def test_registered_counts_for_activities(db_session):
    act_with_people = uuid4()
    act_empty = uuid4()
    for act_id in (act_with_people, act_empty):
        db_session.add(
            Activity(
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
        Participation(activity_id=act_with_people, user_id="usr_2", status="aceptada"),
        Participation(activity_id=act_with_people, user_id="usr_3", status="aceptada"),
        # Las solicitudes pendientes no ocupan cupo
        Participation(activity_id=act_with_people, user_id="usr_4", status="pendiente"),
    ])
    db_session.commit()

    counts = Participation.count_accepted_by_activity(db_session, [act_with_people, act_empty])

    assert counts == {act_with_people: 2, act_empty: 0}
    assert Participation.count_accepted_by_activity(db_session, []) == {}
