from datetime import date, datetime, timezone
from uuid import UUID

from pydantic import Field
from sqlmodel import SQLModel

from app.entities.activity import Activity
from app.entities.participation import Participation
from app.entities.registro_horas import RegistroHoras


# ── Entrada ───────────────────────────────────────────────────────────────────
class HorasParticipanteRequest(SQLModel):
    user_id: str
    horas: float


class RegistrarJornadaRequest(SQLModel):
    jornada: date
    registros: list[HorasParticipanteRequest] = Field(default_factory=list)


class CorregirHorasRequest(SQLModel):
    horas: float


class ReclamarHorasRequest(SQLModel):
    motivo: str


# ── Salida ────────────────────────────────────────────────────────────────────
class RegistroHorasRead(SQLModel):
    id: UUID
    user_id: str
    user_name: str
    user_image: str | None = None
    jornada: date
    horas: float
    # pendiente | confirmada | reclamada
    estado: str
    motivo_reclamo: str | None = None
    horas_anteriores: float | None = None


class ParticipanteAceptadoRead(SQLModel):
    id: str
    name: str
    image: str | None = None


class HorasActividadRead(SQLModel):
    activity_id: UUID
    es_organizador: bool
    # true si la actividad ya terminó y quien pide es el organizador
    puede_registrar: bool
    # Solo al organizador: a quién se le pueden registrar horas
    participantes_aceptados: list[ParticipanteAceptadoRead] = []
    # Organizador: todos los registros. Voluntario: solo los suyos.
    registros: list[RegistroHorasRead] = []
    # Solo cuentan las horas confirmadas
    total_confirmado: float = 0


class JornadaConstanciaRead(SQLModel):
    jornada: date
    horas: float


class ActividadConstanciaRead(SQLModel):
    activity_id: UUID
    nombre: str
    organizador: str | None = None
    fecha: datetime
    jornadas: list[JornadaConstanciaRead]
    total_horas: float


class ConstanciaRead(SQLModel):
    voluntario: str
    correo: str
    emitida: datetime
    actividades: list[ActividadConstanciaRead]
    total_horas: float


def to_registro(registro: RegistroHoras) -> RegistroHorasRead:
    return RegistroHorasRead(
        id=registro.id,
        user_id=registro.user_id,
        user_name=registro.user_name,
        user_image=registro.user_image,
        jornada=registro.jornada,
        horas=registro.horas,
        estado=registro.estado,
        motivo_reclamo=registro.motivo_reclamo,
        horas_anteriores=registro.horas_anteriores,
    )


def to_horas_actividad(
    activity: Activity,
    *,
    es_organizador: bool,
    puede_registrar: bool,
    aceptados: list[Participation],
    registros: list[RegistroHoras],
    total_confirmado: float,
) -> HorasActividadRead:
    return HorasActividadRead(
        activity_id=activity.id,
        es_organizador=es_organizador,
        puede_registrar=puede_registrar,
        participantes_aceptados=[
            ParticipanteAceptadoRead(id=p.user_id, name=p.user_name, image=p.user_image)
            for p in aceptados
        ],
        registros=[to_registro(r) for r in registros],
        total_confirmado=total_confirmado,
    )


def to_constancia(
    voluntario: str,
    correo: str,
    actividades: list[tuple[Activity, list[RegistroHoras], float]],
    total_horas: float,
) -> ConstanciaRead:
    """Cada actividad llega con sus jornadas confirmadas y su subtotal."""
    return ConstanciaRead(
        voluntario=voluntario,
        correo=correo,
        emitida=datetime.now(timezone.utc),
        actividades=[
            ActividadConstanciaRead(
                activity_id=activity.id,
                nombre=activity.name,
                organizador=activity.creator_name,
                fecha=activity.date,
                jornadas=[JornadaConstanciaRead(jornada=r.jornada, horas=r.horas) for r in registros],
                total_horas=subtotal,
            )
            for activity, registros, subtotal in actividades
        ],
        total_horas=total_horas,
    )
