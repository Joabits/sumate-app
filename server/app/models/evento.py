"""
Eventos de analítica de interacción.

Cada vez que alguien empieza o termina un flujo principal se guarda una línea
con el nombre del evento, sus propiedades y la fecha. Después se cuentan las
líneas y sale el número que responde la pregunta:

    ¿Cuántos de los que empiezan a postular a una actividad envían la solicitud?

Se registra la acción, no a la persona: la tabla no tiene usuario, correo,
nombre ni la actividad. Cada evento tiene una lista fija de propiedades y se
rechaza cualquier otra.
"""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime, func, text
from sqlmodel import Field, Session, SQLModel, select

from app.models.base import utc_now
from app.models.exceptions import EventoInvalidoException


class NombreEvento(StrEnum):
    # Abrió la confirmación para postular a una actividad
    POSTULACION_INICIADA = "postulacion_iniciada"
    # La solicitud quedó guardada (pendiente o en la lista de espera)
    POSTULACION_ENVIADA = "postulacion_enviada"


# Propiedades de cada evento y su tipo. Solo lo que la pregunta necesita.
PROPIEDADES: dict[NombreEvento, dict[str, type]] = {
    NombreEvento.POSTULACION_INICIADA: {"lista_de_espera": bool},
    NombreEvento.POSTULACION_ENVIADA: {"lista_de_espera": bool},
}


def validar_props(evento: NombreEvento, props: dict[str, Any]) -> dict[str, Any]:
    """Deja pasar solo las propiedades definidas para el evento, con su tipo."""
    permitidas = PROPIEDADES[evento]
    if set(props) != set(permitidas):
        raise EventoInvalidoException(
            f"{evento.value} lleva solo estas propiedades: {', '.join(permitidas)}."
        )
    for nombre, tipo in permitidas.items():
        # type() y no isinstance(): True no debe pasar por un número ni al revés
        if type(props[nombre]) is not tipo:
            raise EventoInvalidoException(f"La propiedad {nombre} no tiene el tipo esperado.")
    return {nombre: props[nombre] for nombre in permitidas}


class Evento(SQLModel, table=True):
    __tablename__ = "eventos"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    evento: str = Field(max_length=60, index=True)
    props: dict[str, Any] = Field(default_factory=dict, sa_type=JSON, nullable=False)
    # La pone el servidor al guardar, no el reloj del celular
    fecha: datetime = Field(
        default_factory=utc_now,
        sa_type=DateTime(timezone=True),
        nullable=False,
    )

    @classmethod
    def registrar(cls, session: Session, evento: NombreEvento, props: dict[str, Any]) -> "Evento":
        nuevo = cls(evento=evento.value, props=validar_props(evento, props))
        session.add(nuevo)
        return nuevo

    @classmethod
    def contar_postulaciones(cls, session: Session) -> dict[tuple[str, bool], int]:
        """Cuántas postulaciones iniciadas y enviadas hay, con cupos y en lista de espera."""
        lista_de_espera = cls.props["lista_de_espera"].as_boolean().label("lista_de_espera")
        filas = session.exec(
            select(cls.evento, lista_de_espera, func.count())
            .where(
                cls.evento.in_(
                    [NombreEvento.POSTULACION_INICIADA.value, NombreEvento.POSTULACION_ENVIADA.value]
                )
            )
            .group_by(cls.evento, text("lista_de_espera"))
        ).all()
        return {(evento, bool(espera)): total for evento, espera, total in filas}

    @classmethod
    def ultimos(cls, session: Session, limite: int = 10) -> list["Evento"]:
        return list(session.exec(select(cls).order_by(cls.fecha.desc()).limit(limite)).all())
