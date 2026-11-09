from enum import StrEnum
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement
from sqlmodel import Field, Relationship, Session, UniqueConstraint, select

from app.models.activity import Activity
from app.models.base import BaseModel
from app.models.exceptions import (
    ActivityCapacityExceededException,
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
    NoEstaEnListaDeEsperaException,
    ParticipationNotFoundException,
    SolicitudRechazadaException,
    SolicitudYaRevisadaException,
)
from app.models.user import User


class EstadoParticipacion(StrEnum):
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    # Los cupos estaban llenos: espera a que alguien cancele
    EN_ESPERA = "en_espera"
    # La organización canceló la actividad
    CANCELADA = "cancelada"


# Solicitudes que pasan a canceladas cuando la organización cancela la actividad
ESTADOS_QUE_SE_CANCELAN = (
    EstadoParticipacion.PENDIENTE,
    EstadoParticipacion.ACEPTADA,
    EstadoParticipacion.EN_ESPERA,
)


class Participation(BaseModel, table=True):
    """Solicitud de un voluntario para participar en una actividad."""

    __tablename__ = "participations"
    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_participation_activity_user"),
    )

    activity_id: UUID = Field(foreign_key="activity.id", index=True, nullable=False)
    user_id: str = Field(index=True, nullable=False)
    # Valores de EstadoParticipacion
    status: str = Field(
        default=EstadoParticipacion.PENDIENTE.value, max_length=20, index=True, nullable=False
    )
    # Estado antes de que la organización cancelara la actividad (historial)
    estado_anterior: str | None = Field(default=None, max_length=20, nullable=True)

    user: Optional[User] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "foreign(Participation.user_id) == User.id",
            "viewonly": True,
            "lazy": "selectin",
        }
    )
    activity: Optional[Activity] = Relationship(sa_relationship_kwargs={"viewonly": True})

    @property
    def estado(self) -> EstadoParticipacion:
        return EstadoParticipacion(self.status)

    @property
    def user_name(self) -> str:
        return self.user.name if self.user and self.user.name else "Usuario"

    @property
    def user_image(self) -> str | None:
        return self.user.image if self.user else None

    # ── Creación ──────────────────────────────────────────────────────────────
    @classmethod
    def solicitar(
        cls, session: Session, activity: Activity, user_id: str
    ) -> "Participation":
        """
        El voluntario solicita participar. Si hay cupos la solicitud queda
        pendiente; si están llenos, entra a la lista de espera.
        La actividad debe venir bloqueada (FOR UPDATE).
        """
        if activity.owner_id == user_id:
            raise CannotJoinOwnActivityException()
        # Una actividad cancelada ya no recibe solicitudes
        activity.ensure_not_cancelled()
        if not activity.is_active:
            raise CannotJoinInactiveActivityException()
        if activity.has_passed():
            raise CannotJoinPastActivityException()

        existente = cls.get_of_user(session, activity.id, user_id)
        if existente is not None:
            if existente.estado == EstadoParticipacion.RECHAZADA:
                raise SolicitudRechazadaException()
            raise AlreadyParticipatingException()

        lleno = cls.count_accepted(session, activity.id) >= activity.capacity
        estado = EstadoParticipacion.EN_ESPERA if lleno else EstadoParticipacion.PENDIENTE
        return cls(activity_id=activity.id, user_id=user_id, status=estado.value)

    # ── Reglas de negocio ─────────────────────────────────────────────────────
    def aceptar(self) -> None:
        if self.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        self.status = EstadoParticipacion.ACEPTADA.value

    def aceptar_en(self, session: Session, activity: Activity) -> None:
        """El organizador acepta la solicitud si la actividad no pasó y quedan cupos."""
        if activity.has_passed():
            raise CannotJoinPastActivityException()
        if self.count_accepted(session, activity.id) >= activity.capacity:
            raise ActivityCapacityExceededException()
        self.aceptar()

    def rechazar(self) -> None:
        if self.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        self.status = EstadoParticipacion.RECHAZADA.value

    def cancelar_por_organizacion(self) -> None:
        """La actividad se canceló: la solicitud queda cancelada y guarda su estado anterior."""
        if self.estado not in ESTADOS_QUE_SE_CANCELAN:
            raise SolicitudYaRevisadaException()
        self.estado_anterior = self.status
        self.status = EstadoParticipacion.CANCELADA.value

    def ocupar_cupo_liberado(self) -> None:
        """Se liberó un cupo y esta solicitud era la primera en espera: queda aceptada."""
        if self.estado != EstadoParticipacion.EN_ESPERA:
            raise NoEstaEnListaDeEsperaException()
        self.status = EstadoParticipacion.ACEPTADA.value

    @classmethod
    def llenar_cupos_desde_lista_de_espera(
        cls, session: Session, activity: Activity
    ) -> list["Participation"]:
        """
        Mientras haya cupos libres, la primera solicitud en espera pasa a aceptada.
        Se usa cuando alguien aceptado cancela y cuando el organizador agrega cupos.
        Quien llama debe tener la actividad bloqueada (FOR UPDATE) y hacer el commit.
        """
        # Una actividad cancelada no hace entrar a nadie de la lista de espera
        if activity.is_cancelled:
            return []
        session.flush()
        cupos_libres = activity.capacity - cls.count_accepted(session, activity.id)
        if cupos_libres <= 0:
            return []
        entran = cls.list_waiting(session, activity.id)[:cupos_libres]
        for solicitud in entran:
            solicitud.ocupar_cupo_liberado()
        return entran

    # ── Consultas ─────────────────────────────────────────────────────────────
    @classmethod
    def is_confirmed(cls) -> ColumnElement[bool]:
        """
        Única condición de lo que cuenta como participación confirmada (ocupa un cupo).
        Todas las consultas que cuentan inscritos la usan, así la regla vive en un solo lugar.
        """
        return and_(
            cls.deleted_date.is_(None),
            cls.status == EstadoParticipacion.ACEPTADA.value,
        )

    @classmethod
    def get_of_user(
        cls, session: Session, activity_id: UUID, user_id: str
    ) -> "Participation | None":
        """Solicitud del usuario en la actividad, en cualquier estado."""
        statement = select(cls).where(
            cls.activity_id == activity_id,
            cls.user_id == user_id,
            cls.deleted_date.is_(None),
        )
        return session.exec(statement).first()

    @classmethod
    def get_of_user_or_404(
        cls, session: Session, activity_id: UUID, user_id: str
    ) -> "Participation":
        solicitud = cls.get_of_user(session, activity_id, user_id)
        if solicitud is None:
            raise ParticipationNotFoundException()
        return solicitud

    @classmethod
    def count_accepted(cls, session: Session, activity_id: UUID) -> int:
        statement = select(func.count(cls.id)).where(
            cls.activity_id == activity_id, cls.is_confirmed()
        )
        return int(session.exec(statement).one())

    @classmethod
    def count_accepted_by_activity(
        cls, session: Session, activity_ids: list[UUID]
    ) -> dict[UUID, int]:
        result: dict[UUID, int] = {activity_id: 0 for activity_id in activity_ids}
        if not activity_ids:
            return result
        statement = (
            select(cls.activity_id, func.count(cls.id))
            .where(cls.activity_id.in_(activity_ids), cls.is_confirmed())
            .group_by(cls.activity_id)
        )
        for activity_id, count in session.exec(statement).all():
            result[activity_id] = int(count)
        return result

    @classmethod
    def list_by_status(
        cls,
        session: Session,
        activity_id: UUID,
        estado: EstadoParticipacion = EstadoParticipacion.ACEPTADA,
    ) -> list["Participation"]:
        """Solicitudes de la actividad en un estado, en orden de llegada."""
        statement = (
            select(cls)
            .where(
                cls.activity_id == activity_id,
                cls.deleted_date.is_(None),
                cls.status == estado.value,
            )
            .order_by(cls.created_date.asc())
        )
        return list(session.exec(statement).all())

    @classmethod
    def list_waiting(cls, session: Session, activity_id: UUID) -> list["Participation"]:
        # Orden de llegada: la primera en solicitar es la primera en entrar
        return cls.list_by_status(session, activity_id, EstadoParticipacion.EN_ESPERA)

    @classmethod
    def list_applicants(cls, session: Session, activity_id: UUID) -> list["Participation"]:
        """Solicitudes pendientes, aceptadas y en lista de espera de una actividad."""
        statement = select(cls).where(
            cls.activity_id == activity_id,
            cls.deleted_date.is_(None),
            cls.status.in_([e.value for e in ESTADOS_QUE_SE_CANCELAN]),
        )
        return list(session.exec(statement).all())

    @classmethod
    def list_of_user(cls, session: Session, user_id: str) -> list["Participation"]:
        """Solicitudes del voluntario con su actividad (Mi trayectoria)."""
        statement = (
            select(cls)
            .join(Activity, cls.activity_id == Activity.id)
            .where(
                cls.user_id == user_id,
                cls.deleted_date.is_(None),
                Activity.deleted_date.is_(None),
                Activity.owner_id != user_id,
            )
            .options(selectinload(cls.activity))
        )
        return list(session.exec(statement).all())

    @classmethod
    def delete_unconfirmed(cls, session: Session, activity_id: UUID) -> None:
        """Borra las solicitudes que no ocupan cupo (pendientes, rechazadas, en espera)."""
        statement = select(cls).where(
            cls.activity_id == activity_id,
            cls.status != EstadoParticipacion.ACEPTADA.value,
        )
        for record in session.exec(statement).all():
            session.delete(record)
