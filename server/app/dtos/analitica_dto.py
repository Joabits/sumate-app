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
class PasoRead(SQLModel):
    evento: str
    etiqueta: str
    # Cuántos llegaron a este paso
    cantidad: int


class EmbudoRead(SQLModel):
    clave: str
    titulo: str
    # La pregunta que responde el embudo
    pregunta: str
    pasos: list[PasoRead]
    # Veces que el flujo se frenó por validación o permiso (accion_rechazada)
    rechazos: int = 0


class RechazoRead(SQLModel):
    flujo: str
    motivo: str
    cantidad: int


class EventoRead(SQLModel):
    evento: str
    props: dict[str, Any]
    fecha: datetime


class AnaliticaRead(SQLModel):
    embudos: list[EmbudoRead]
    rechazos: list[RechazoRead]
    ultimos: list[EventoRead]


def to_ultimos(eventos: list[Evento]) -> list[EventoRead]:
    return [EventoRead(evento=e.evento, props=e.props, fecha=e.fecha) for e in eventos]
