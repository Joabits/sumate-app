from datetime import date, datetime, timezone
from uuid import UUID

from pydantic import Field
from sqlmodel import SQLModel

from app.models.activity import Activity
from app.models.participation import Participation
from app.models.registro_horas import RegistroHoras


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


def render_registro(registro: RegistroHoras) -> RegistroHorasRead:
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


def render_horas_actividad(
    activity: Activity,
    *,
    es_organizador: bool,
    puede_registrar: bool,
    aceptados: list[Participation],
    registros: list[RegistroHoras],
) -> HorasActividadRead:
    return HorasActividadRead(
        activity_id=activity.id,
        es_organizador=es_organizador,
        puede_registrar=puede_registrar,
        participantes_aceptados=[
            ParticipanteAceptadoRead(id=p.user_id, name=p.user_name, image=p.user_image)
            for p in aceptados
        ],
        registros=[render_registro(r) for r in registros],
        total_confirmado=RegistroHoras.total_confirmado(registros),
    )


def render_constancia(
    voluntario: str, correo: str, confirmadas: list[RegistroHoras]
) -> ConstanciaRead:
    """Agrupa las horas confirmadas por actividad. Viene solo con confirmadas."""
    por_actividad: dict[UUID, list[RegistroHoras]] = {}
    for registro in confirmadas:
        por_actividad.setdefault(registro.activity_id, []).append(registro)

    actividades = []
    for registros in por_actividad.values():
        activity = registros[0].activity
        actividades.append(
            ActividadConstanciaRead(
                activity_id=activity.id,
                nombre=activity.name,
                organizador=activity.creator_name,
                fecha=activity.date,
                jornadas=[JornadaConstanciaRead(jornada=r.jornada, horas=r.horas) for r in registros],
                total_horas=RegistroHoras.total_confirmado(registros),
            )
        )

    return ConstanciaRead(
        voluntario=voluntario,
        correo=correo,
        emitida=datetime.now(timezone.utc),
        actividades=actividades,
        total_horas=RegistroHoras.total_confirmado(confirmadas),
    )
