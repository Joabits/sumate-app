"""Mis datos (ver y descargar) y eliminar la cuenta (Tarea 10)."""

from datetime import date, datetime
from uuid import UUID

from app.dtos.base import ReadModel
from app.entities.activity import Activity
from app.entities.participation import Participation
from app.entities.registro_horas import RegistroHoras
from app.entities.user import User


class PerfilRead(ReadModel):
    nombre: str
    correo: str
    foto: str | None = None


class ActividadOrganizadaRead(ReadModel):
    id: UUID
    nombre: str
    fecha: datetime
    estado: str
    cupos: int
    motivo_cancelacion: str | None = None


class SolicitudRead(ReadModel):
    actividad: str
    fecha_actividad: datetime
    estado: str
    solicitada_el: datetime
    motivo_retiro: str | None = None


class HorasRead(ReadModel):
    actividad: str
    jornada: date
    horas: float
    estado: str
    motivo_reclamo: str | None = None


class ActividadPorTerminarRead(ReadModel):
    id: UUID
    nombre: str
    fecha: datetime


class MisDatosRead(ReadModel):
    perfil: PerfilRead
    actividades_organizadas: list[ActividadOrganizadaRead]
    solicitudes: list[SolicitudRead]
    horas: list[HorasRead]
    # Si no está vacía, la cuenta no se puede eliminar todavía (la regla de la app)
    actividades_por_terminar: list[ActividadPorTerminarRead]


class CuentaEliminadaRead(ReadModel):
    """Qué pasó con los datos que afectan a otras personas."""

    solicitudes_retiradas: int
    # Cupos aceptados que pasaron a la primera persona de la lista de espera
    cupos_liberados: int
    horas_confirmadas_conservadas: int


def to_mis_datos(
    user: User,
    actividades: list[Activity],
    solicitudes: list[Participation],
    horas: list[RegistroHoras],
    por_terminar: list[Activity],
) -> MisDatosRead:
    return MisDatosRead(
        perfil=PerfilRead(nombre=user.name, correo=user.email, foto=user.image),
        actividades_organizadas=[
            ActividadOrganizadaRead(
                id=a.id,
                nombre=a.name,
                fecha=a.date,
                estado=a.status,
                cupos=a.capacity,
                motivo_cancelacion=a.motivo_cancelacion,
            )
            for a in actividades
        ],
        solicitudes=[
            SolicitudRead(
                actividad=s.activity.name if s.activity else "Actividad eliminada",
                fecha_actividad=s.activity.date if s.activity else s.created_date,
                estado=s.status,
                solicitada_el=s.created_date,
                motivo_retiro=s.motivo_retiro,
            )
            for s in solicitudes
        ],
        horas=[
            HorasRead(
                actividad=r.activity.name if r.activity else "Actividad eliminada",
                jornada=r.jornada,
                horas=r.horas,
                estado=r.estado,
                motivo_reclamo=r.motivo_reclamo,
            )
            for r in horas
        ],
        actividades_por_terminar=[
            ActividadPorTerminarRead(id=a.id, nombre=a.name, fecha=a.date) for a in por_terminar
        ],
    )
