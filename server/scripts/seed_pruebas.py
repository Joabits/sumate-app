"""Semilla de las pruebas E2E: deja datos conocidos antes de cada corrida.

Un solo comando, dentro de server:

    python scripts/seed_pruebas.py

1. Carga las causas si faltan.
2. Crea los usuarios de prueba si faltan (contraseña Demo12345).
3. Borra las actividades de esos usuarios con sus solicitudes, también las que
   crearon las pruebas en corridas anteriores.
4. Vuelve a crear las actividades de la demo y las que usan las pruebas.

No toca a los demás usuarios ni a sus actividades. Playwright la corre sola
antes de cada corrida (client/tests/semilla.ts).
"""

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import bindparam, text
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine
from app.models import Activity, ActivityCause, ActivityDetail, Cause, Participation
from seed_causes import seed_causes
from seed_demo import ACTIVITIES, DEMO_PASSWORD, IMG, USERS, hash_password

USUARIOS = USERS + [
    # Sin actividades ni solicitudes: sirve para ver los estados vacíos
    {"id": "demo-pedro", "name": "Pedro Nuevo", "email": "nuevo@sumate.dev"},
]

ACTIVIDADES_PRUEBAS = [
    {
        # Horas y constancia: ya terminó (hace 3 días), con Luis y Sofía aceptados
        "name": "Jornada de reforestación en el Tunari",
        "owner": "demo-ana",
        "image": IMG.format("1542601906990-b4d3fb778b09"),
        "days": -3,
        "capacity": 10,
        "causes": ["medio-ambiente"],
        "place": "Parque Nacional Tunari",
        "lat": -17.3550,
        "lng": -66.1700,
        "description": "Plantamos árboles nativos durante dos jornadas en la ladera del Tunari.",
        "participants": ["demo-luis", "demo-sofia"],
    },
    {
        # Solicitar participar: María es aceptada y Carlos rechazado
        "name": "Recolección de libros para la biblioteca",
        "owner": "demo-ana",
        "image": IMG.format("1481627834876-b7833e8f5570"),
        "days": 9,
        "capacity": 10,
        "causes": ["educacion", "comunidad"],
        "place": "Biblioteca Municipal",
        "lat": -17.3920,
        "lng": -66.1580,
        "description": "Recibimos y ordenamos libros donados para la biblioteca del barrio.",
        "participants": [],
    },
    {
        # Lista de espera: un solo cupo, ya ocupado por Luis
        "name": "Taller de primeros auxilios",
        "owner": "demo-ana",
        "image": IMG.format("1584515933487-779824d29309"),
        "days": 6,
        "capacity": 1,
        "causes": ["salud"],
        "place": "Cruz Roja Cochabamba",
        "lat": -17.3890,
        "lng": -66.1500,
        "description": "Práctica de RCP y vendajes con instructores de la Cruz Roja.",
        "participants": ["demo-luis"],
    },
    {
        # Lista de espera, camino alternativo: un solo cupo, ocupado por Carlos
        "name": "Charla de reciclaje en el colegio",
        "owner": "demo-ana",
        "image": IMG.format("1532996122724-e3c354a0b15b"),
        "days": 7,
        "capacity": 1,
        "causes": ["medio-ambiente", "educacion"],
        "place": "Colegio La Salle",
        "lat": -17.3800,
        "lng": -66.1650,
        "description": "Explicamos a los estudiantes cómo separar residuos en casa.",
        "participants": ["demo-carlos"],
    },
    {
        # Cerrar convocatoria
        "name": "Cine foro en el barrio",
        "owner": "demo-ana",
        "image": IMG.format("1489599849927-2ee91cede3ba"),
        "days": 10,
        "capacity": 20,
        "causes": ["cultura-y-arte"],
        "place": "Casa de la Cultura",
        "lat": -17.3930,
        "lng": -66.1560,
        "description": "Proyección de una película y conversación con los vecinos.",
        "participants": [],
    },
    {
        # Reabrir convocatoria
        "name": "Feria de emprendedores",
        "owner": "demo-ana",
        "image": IMG.format("1488459716781-31db52582fe9"),
        "days": 11,
        "capacity": 15,
        "causes": ["comunidad"],
        "place": "Plaza Principal",
        "lat": -17.3936,
        "lng": -66.1570,
        "description": "Apoyo a los puestos de emprendedores jóvenes del barrio.",
        "participants": [],
        "status": "closed",
    },
    {
        # Cancelar actividad: un cupo y postulantes en tres estados
        "name": "Taller de huertos urbanos",
        "owner": "demo-ana",
        "image": IMG.format("1416879595882-3373a0480b5b"),
        "days": 8,
        "capacity": 1,
        "causes": ["medio-ambiente", "comunidad"],
        "place": "Huerto del Parque Lincoln",
        "lat": -17.3810,
        "lng": -66.1630,
        "description": "Preparamos almácigos y enseñamos a cuidar un huerto en casa.",
        "participants": ["demo-luis"],
        "pendientes": ["demo-maria"],
        "en_espera": ["demo-sofia"],
    },
    {
        # Analítica: Carlos abre la confirmación, la cierra y después envía la solicitud
        "name": "Clasificación de donaciones en el banco de alimentos",
        "owner": "demo-ana",
        "image": IMG.format("1488459716781-31db52582fe9"),
        "days": 12,
        "capacity": 8,
        "causes": ["comunidad"],
        "place": "Banco de Alimentos Cochabamba",
        "lat": -17.4010,
        "lng": -66.1600,
        "description": "Separamos y empaquetamos las donaciones de alimentos que llegan cada semana.",
        "participants": [],
    },
    {
        # Analítica en lista de espera: un solo cupo, ya ocupado por María
        "name": "Lectura de cuentos en el Hospital del Niño",
        "owner": "demo-ana",
        "image": IMG.format("1503676260728-1c00da094a0b"),
        "days": 13,
        "capacity": 1,
        "causes": ["salud", "ninez-y-juventud"],
        "place": "Hospital del Niño Manuel Ascencio Villarroel",
        "lat": -17.3780,
        "lng": -66.1550,
        "description": "Leemos cuentos por las tardes a los niños internados.",
        "participants": ["demo-maria"],
    },
    {
        # Borrador sin descripción, causas ni ubicación: no se puede publicar
        "name": "Colecta de ropa de invierno",
        "owner": "demo-ana",
        "image": IMG.format("1489987707025-afc232f7ea0f"),
        "days": 14,
        "capacity": 8,
        "causes": [],
        "status": "draft",
        "sin_detalle": True,
        "participants": [],
    },
]


def crear_usuarios_faltantes(session: Session) -> None:
    now = datetime.now(timezone.utc)
    for user in USUARIOS:
        existe = session.execute(
            text('SELECT 1 FROM "user" WHERE id = :id'), {"id": user["id"]}
        ).first()
        if existe:
            continue
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


def borrar_actividades_de_prueba(session: Session) -> None:
    ids = [user["id"] for user in USUARIOS]
    actividades = session.exec(
        select(Activity).where(Activity.owner_id.in_(ids))
    ).all()
    actividad_ids = [a.id for a in actividades]
    if not actividad_ids:
        return

    for tabla in ("registros_horas", "participations", "activity_causes", "activity_detail"):
        session.execute(
            text(f"DELETE FROM {tabla} WHERE activity_id IN :ids").bindparams(
                bindparam("ids", expanding=True)
            ),
            {"ids": actividad_ids},
        )
    imagenes = [a.image_url for a in actividades]
    for actividad in actividades:
        session.delete(actividad)
    session.flush()

    # Portadas que subieron las pruebas a la carpeta del servidor
    for url in imagenes:
        if "/uploads/" in url:
            archivo = settings.uploads_path / url.split("/uploads/", 1)[1]
            archivo.unlink(missing_ok=True)


def crear_actividades(session: Session, actividades: list[dict]) -> None:
    causas = {c.slug: c.id for c in session.exec(select(Cause)).all()}
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)

    for item in actividades:
        actividad = Activity(
            id=uuid.uuid4(),
            name=item["name"],
            owner_id=item["owner"],
            image_url=item["image"],
            date=now + timedelta(days=item["days"], hours=2),
            status=item.get("status", "active"),
            capacity=item["capacity"],
        )
        session.add(actividad)
        session.flush()

        if not item.get("sin_detalle"):
            session.add(
                ActivityDetail(
                    activity_id=actividad.id,
                    latitude=item.get("lat"),
                    longitude=item.get("lng"),
                    place=item.get("place"),
                    address=item.get("address"),
                    description=item.get("description"),
                )
            )
        for slug in item["causes"]:
            session.add(ActivityCause(activity_id=actividad.id, cause_id=causas[slug]))

        solicitudes = (
            [(user_id, "aceptada") for user_id in item["participants"]]
            + [(user_id, "pendiente") for user_id in item.get("pendientes", [])]
            + [(user_id, "rechazada") for user_id in item.get("rechazadas", [])]
            + [(user_id, "en_espera") for user_id in item.get("en_espera", [])]
        )
        for user_id, estado in solicitudes:
            session.add(
                Participation(activity_id=actividad.id, user_id=user_id, status=estado)
            )
            # Separa las fechas de solicitud para que el orden de llegada sea claro
            session.flush()


def seed_pruebas() -> None:
    seed_causes()
    with Session(engine) as session:
        crear_usuarios_faltantes(session)
        borrar_actividades_de_prueba(session)
        crear_actividades(session, ACTIVITIES + ACTIVIDADES_PRUEBAS)
        session.commit()
    print(
        f"Semilla de pruebas lista: {len(USUARIOS)} usuarios, "
        f"{len(ACTIVITIES) + len(ACTIVIDADES_PRUEBAS)} actividades."
    )


if __name__ == "__main__":
    seed_pruebas()
