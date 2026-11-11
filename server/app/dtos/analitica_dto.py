from datetime import datetime
from typing import Any

from sqlmodel import SQLModel

from app.entities.evento import Evento, NombreEvento


# ── Entrada ───────────────────────────────────────────────────────────────────
class EventoRequest(SQLModel):
    # Solo nombres de la lista fija; cualquier otro responde 422
    evento: NombreEvento
    props: dict[str, Any] = {}


# ── Salida ────────────────────────────────────────────────────────────────────
class ConteoRead(SQLModel):
    iniciadas: int = 0
    enviadas: int = 0


class EmbudoPostulacionRead(SQLModel):
    total: ConteoRead
    con_cupos: ConteoRead
    lista_de_espera: ConteoRead


class EventoRead(SQLModel):
    evento: str
    props: dict[str, Any]
    fecha: datetime


class AnaliticaRead(SQLModel):
    postulacion: EmbudoPostulacionRead
    ultimos: list[EventoRead]


def to_conteo(
    conteos: dict[tuple[str, bool], int], lista_de_espera: bool | None = None
) -> ConteoRead:
    """Suma los conteos de un tipo de postulación (None = los dos)."""

    def total(evento: NombreEvento) -> int:
        return sum(
            cantidad
            for (nombre, espera), cantidad in conteos.items()
            if nombre == evento.value and (lista_de_espera is None or espera == lista_de_espera)
        )

    return ConteoRead(
        iniciadas=total(NombreEvento.POSTULACION_INICIADA),
        enviadas=total(NombreEvento.POSTULACION_ENVIADA),
    )


def to_analitica(conteos: dict[tuple[str, bool], int], ultimos: list[Evento]) -> AnaliticaRead:
    return AnaliticaRead(
        postulacion=EmbudoPostulacionRead(
            total=to_conteo(conteos),
            con_cupos=to_conteo(conteos, lista_de_espera=False),
            lista_de_espera=to_conteo(conteos, lista_de_espera=True),
        ),
        ultimos=[EventoRead(evento=e.evento, props=e.props, fecha=e.fecha) for e in ultimos],
    )
