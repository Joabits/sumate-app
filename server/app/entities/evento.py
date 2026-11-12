"""
Evento de analítica de interacción.

Se registra la acción, no a la persona: la tabla no tiene usuario, correo,
nombre ni la actividad. Las propiedades permitidas de cada evento se
validan en app/services/analitica_service.py.
"""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime
from sqlmodel import Field, SQLModel

from app.core.fechas import utc_now


class NombreEvento(StrEnum):
    """Lista fija de eventos: objeto + acción en pasado. Plan en evidencias/tarea-9.md."""

    # ── Postular a una actividad (voluntario → organizador) ──
    # Abrió la confirmación para postular
    POSTULACION_INICIADA = "postulacion_iniciada"
    # La solicitud quedó guardada (pendiente o en la lista de espera)
    POSTULACION_ENVIADA = "postulacion_enviada"
    # El organizador aceptó una solicitud pendiente
    SOLICITUD_ACEPTADA = "solicitud_aceptada"

    # ── Retirarse de una actividad (Tarea 9) ──
    # Abrió la confirmación del retiro
    RETIRO_INICIADO = "retiro_iniciado"
    # El retiro quedó guardado
    RETIRO_CONFIRMADO = "retiro_confirmado"

    # ── Crear y publicar una actividad (organizador) ──
    ACTIVIDAD_CREACION_INICIADA = "actividad_creacion_iniciada"
    ACTIVIDAD_CREADA = "actividad_creada"
    ACTIVIDAD_PUBLICADA = "actividad_publicada"

    # ── Horas de voluntariado (Tarea 8) ──
    # La organización registró una jornada para N participantes
    HORAS_REGISTRADAS = "horas_registradas"
    # El voluntario aceptó o reclamó sus horas
    HORAS_RESPONDIDAS = "horas_respondidas"

    # ── Buscar actividades ──
    BUSQUEDA_REALIZADA = "busqueda_realizada"

    # ── Errores que frenan la tarea (validación o permiso), con motivo de una lista fija ──
    ACCION_RECHAZADA = "accion_rechazada"


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
