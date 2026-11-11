"""
Ayudantes de las pruebas.

Los controladores se llaman como funciones normales (sin levantar el
servidor), con un service armado sobre la base en memoria y un usuario autenticado.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.core.security import AuthUser
from app.entities import Activity, ActivityCause, ActivityDetail, Cause, Participation, User

IMAGEN = "http://localhost:8000/uploads/activities/test.webp"
ORGANIZADOR = "organizador_1"


def usuario(user_id: str) -> AuthUser:
    """Usuario autenticado, como lo entrega CurrentUser."""
    return AuthUser(user_id=user_id, email=f"{user_id}@example.com")


def run(coro):
    """Ejecuta un controlador async."""
    return asyncio.run(coro)


def en_dias(dias: float) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=dias)


def crear_usuario(session: Session, user_id: str, name: str, image: str | None = None) -> User:
    user = User(id=user_id, name=name, email=f"{user_id}@example.com", image=image)
    session.add(user)
    session.commit()
    return user


def crear_actividad(
    session: Session,
    *,
    owner_id: str = ORGANIZADOR,
    name: str = "Taller de primeros auxilios",
    status: str = "active",
    capacity: int = 10,
    date: datetime | None = None,
    image_url: str = IMAGEN,
) -> Activity:
    activity = Activity(
        id=uuid4(),
        name=name,
        owner_id=owner_id,
        image_url=image_url,
        date=date or en_dias(3),
        capacity=capacity,
        status=status,
    )
    session.add(activity)
    session.commit()
    return activity


def crear_solicitud(
    session: Session, activity: Activity, user_id: str, estado: str = "pendiente"
) -> Participation:
    participation = Participation(activity_id=activity.id, user_id=user_id, status=estado)
    session.add(participation)
    session.commit()
    return participation


def crear_causa(session: Session, name: str, slug: str | None = None) -> Cause:
    cause = Cause(name=name, slug=slug or name.lower().replace(" ", "-"))
    session.add(cause)
    session.commit()
    return cause


def completar_para_publicar(session: Session, activity: Activity) -> Cause:
    """Agrega ubicación, descripción y una causa: lo que pide publicar."""
    cause = crear_causa(session, "Salud")
    session.add(
        ActivityDetail(
            activity_id=activity.id,
            latitude=-17.39,
            longitude=-66.15,
            place="Plaza Colón",
            description="Una descripción",
        )
    )
    session.add(ActivityCause(activity_id=activity.id, cause_id=cause.id))
    session.commit()
    return cause


def recargar(session: Session, activity: Activity) -> Activity:
    session.expire_all()
    return session.get(Activity, activity.id)


def estados(session: Session, activity: Activity) -> dict[str, str]:
    """Estado de cada solicitud de la actividad, por usuario."""
    session.expire_all()
    statement = select(Participation).where(Participation.activity_id == activity.id)
    return {p.user_id: p.status for p in session.exec(statement).all()}
