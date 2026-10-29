"""Pobla la base con datos de demostración (usuarios, actividades, participaciones).

Es idempotente: si el usuario demo ya existe, no hace nada.
Los usuarios se insertan directo en las tablas de Better Auth con el mismo
formato de contraseña que usa Better Auth (scrypt "salt:hash" en hex).
Contraseña de todos los usuarios demo: Demo12345
"""

import hashlib
import secrets
import sys
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlmodel import Session, select

from app.core.database import engine
from app.modules.activities.infrastructure.persistence.models.activity_cause_model import ActivityCauseModel
from app.modules.activities.infrastructure.persistence.models.activity_detail_model import ActivityDetailModel
from app.modules.activities.infrastructure.persistence.models.activity_model import ActivityModel
from app.modules.activities.infrastructure.persistence.models.cause_model import CauseModel
from app.modules.participations.infrastructure.persistence.models.participation_model import ParticipationModel

DEMO_PASSWORD = "Demo12345"

USERS = [
    {"id": "demo-ana", "name": "Ana Rojas", "email": "ana@sumate.dev"},
    {"id": "demo-luis", "name": "Luis Mamani", "email": "luis@sumate.dev"},
    {"id": "demo-sofia", "name": "Sofía Vargas", "email": "sofia@sumate.dev"},
    {"id": "demo-carlos", "name": "Carlos Quispe", "email": "carlos@sumate.dev"},
    {"id": "demo-maria", "name": "María López", "email": "maria@sumate.dev"},
]

IMG = "https://images.unsplash.com/photo-{}?w=1200&q=80"

ACTIVITIES = [
    {
        "name": "Limpieza del Parque Tunari",
        "owner": "demo-ana",
        "image": IMG.format("1618477461853-cf6ed80faba5"),
        "days": 5,
        "capacity": 30,
        "causes": ["medio-ambiente", "comunidad"],
        "place": "Parque Nacional Tunari",
        "address": "Av. Circunvalación, Cochabamba",
        "lat": -17.3545,
        "lng": -66.1720,
        "description": "Jornada de recolección de residuos y reforestación en la zona baja del parque. Lleva gorra, agua y guantes.",
        "participants": ["demo-sofia", "demo-carlos"],
        "pendientes": ["demo-luis", "demo-maria"],
    },
    {
        "name": "Apoyo escolar en matemáticas",
        "owner": "demo-luis",
        "image": IMG.format("1503676260728-1c00da094a0b"),
        "days": 3,
        "capacity": 10,
        "causes": ["educacion", "ninez-y-juventud"],
        "place": "Unidad Educativa Villa Pagador",
        "address": "Zona Sur, Cochabamba",
        "lat": -17.4380,
        "lng": -66.1450,
        "description": "Clases de refuerzo para estudiantes de secundaria. Ideal para universitarios de ingeniería o economía.",
        "participants": ["demo-ana", "demo-sofia"],
    },
    {
        "name": "Campaña de vacunación de mascotas",
        "owner": "demo-sofia",
        "image": IMG.format("1548199973-03cce0bbc87b"),
        "days": 8,
        "capacity": 15,
        "causes": ["animales", "salud"],
        "place": "Plaza 14 de Septiembre",
        "address": "Centro, Cochabamba",
        "lat": -17.3936,
        "lng": -66.1571,
        "description": "Ayuda a registrar mascotas, orientar a los vecinos y apoyar a los veterinarios durante la jornada.",
        "participants": ["demo-carlos"],
        "pendientes": [],
    },
    {
        "name": "Acompañamiento en el hogar de ancianos",
        "owner": "demo-carlos",
        "image": IMG.format("1516307365426-bea591f05011"),
        "days": 2,
        "capacity": 8,
        "causes": ["adulto-mayor", "comunidad"],
        "place": "Hogar San José",
        "address": "Av. Aniceto Arce, Cochabamba",
        "lat": -17.3805,
        "lng": -66.1480,
        "description": "Tarde de juegos de mesa, lectura y conversación con los residentes del hogar.",
        "participants": ["demo-ana", "demo-luis", "demo-sofia"],
    },
    {
        "name": "Taller de programación para jóvenes",
        "owner": "demo-ana",
        "image": IMG.format("1517694712202-14dd9538aa97"),
        "days": 12,
        "capacity": 20,
        "causes": ["tecnologia-social", "educacion"],
        "place": "Virtual (Google Meet)",
        "address": None,
        "lat": None,
        "lng": None,
        "description": "Taller introductorio de programación con Scratch y Python para adolescentes. Se necesitan mentores.",
        "participants": ["demo-carlos"],
        "pendientes": ["demo-sofia", "demo-luis"],
    },
    {
        "name": "Torneo deportivo solidario",
        "owner": "demo-luis",
        "image": IMG.format("1574629810360-7efbbe195018"),
        "days": 15,
        "capacity": 40,
        "causes": ["deporte", "ninez-y-juventud"],
        "place": "Estadio Félix Capriles",
        "address": "Av. Libertador Bolívar, Cochabamba",
        "lat": -17.3780,
        "lng": -66.1610,
        "description": "Torneo de fútbol infantil. Buscamos árbitros, organizadores y apoyo logístico. La entrada es un alimento no perecedero.",
        "participants": [],
    },
    {
        "name": "Mural comunitario en la Cancha",
        "owner": "demo-sofia",
        "image": IMG.format("1460661419201-fd4cecdf8a8b"),
        "days": 20,
        "capacity": 12,
        "causes": ["cultura-y-arte", "comunidad"],
        "place": "Mercado La Cancha",
        "address": "Av. Aroma, Cochabamba",
        "lat": -17.4010,
        "lng": -66.1545,
        "description": "Pintaremos un mural junto a los comerciantes del mercado. No necesitas experiencia, solo ganas.",
        "participants": ["demo-ana"],
        "pendientes": ["demo-carlos"],
        "rechazadas": ["demo-luis"],
    },
    {
        "name": "Feria de salud preventiva",
        "owner": "demo-carlos",
        "image": IMG.format("1576091160550-2173dba999ef"),
        "days": 25,
        "capacity": 25,
        "causes": ["salud", "comunidad"],
        "place": "Plaza Colón",
        "address": "Av. Ballivián, Cochabamba",
        "lat": -17.3865,
        "lng": -66.1595,
        "description": "Toma de presión, glucosa y charlas de prevención. Se buscan estudiantes de medicina y enfermería.",
        "participants": ["demo-luis", "demo-sofia"],
    },
]


def hash_password(password: str) -> str:
    """Mismo algoritmo que Better Auth: scrypt(N=16384, r=16, p=1, dkLen=64)."""
    salt = secrets.token_hex(16)
    key = hashlib.scrypt(
        unicodedata.normalize("NFKC", password).encode(),
        salt=salt.encode(),
        n=16384,
        r=16,
        p=1,
        dklen=64,
        maxmem=64 * 1024 * 1024,
    )
    return f"{salt}:{key.hex()}"


def seed_users(session: Session) -> None:
    now = datetime.now(timezone.utc)
    for user in USERS:
        session.execute(
            text(
                'INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") '
                "VALUES (:id, :name, :email, true, :now, :now)"
            ),
            {**user, "now": now},
        )
        session.execute(
            text(
                'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") '
                "VALUES (:id, :user_id, 'credential', :user_id, :password, :now, :now)"
            ),
            {
                "id": f"acc-{user['id']}",
                "user_id": user["id"],
                "password": hash_password(DEMO_PASSWORD),
                "now": now,
            },
        )


def seed_activities(session: Session) -> None:
    causes = {c.slug: c.id for c in session.exec(select(CauseModel)).all()}
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    for item in ACTIVITIES:
        activity = ActivityModel(
            id=uuid.uuid4(),
            name=item["name"],
            owner_id=item["owner"],
            image_url=item["image"],
            date=now + timedelta(days=item["days"], hours=2),
            status="active",
            capacity=item["capacity"],
        )
        session.add(activity)
        session.flush()

        session.add(
            ActivityDetailModel(
                activity_id=activity.id,
                latitude=item["lat"],
                longitude=item["lng"],
                place=item["place"],
                address=item["address"],
                description=item["description"],
            )
        )
        for slug in item["causes"]:
            session.add(ActivityCauseModel(activity_id=activity.id, cause_id=causes[slug]))
        solicitudes = (
            [(user_id, "aceptada") for user_id in item["participants"]]
            + [(user_id, "pendiente") for user_id in item.get("pendientes", [])]
            + [(user_id, "rechazada") for user_id in item.get("rechazadas", [])]
        )
        for user_id, estado in solicitudes:
            session.add(
                ParticipationModel(activity_id=activity.id, user_id=user_id, status=estado)
            )


def seed_demo() -> None:
    with Session(engine) as session:
        exists = session.execute(
            text('SELECT 1 FROM "user" WHERE id = :id'), {"id": USERS[0]["id"]}
        ).first()
        if exists:
            print("Demo data already present, skipping.")
            return

        seed_users(session)
        seed_activities(session)
        session.commit()
        print(f"Demo seeding completed: {len(USERS)} users, {len(ACTIVITIES)} activities.")


if __name__ == "__main__":
    seed_demo()
