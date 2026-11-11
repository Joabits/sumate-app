"""
Horas de voluntariado por jornada.

La organización registra cuántas horas trabajó cada participante aceptado en
cada jornada de una actividad que ya terminó. El voluntario acepta las horas
o las reclama con un motivo; si la organización las corrige, vuelven a quedar
pendientes hasta que el voluntario las acepte otra vez.

    pendiente ──aceptar──▶ confirmada        (solo estas suman al total y a la constancia)
        │  ▲
  reclamar  corregir
        ▼  │
     reclamada
"""

from uuid import UUID

from sqlmodel import Session

from app.core.fechas import dia_en_bolivia, hoy_en_bolivia
from app.dtos.horas_dto import (
    ConstanciaRead,
    HorasActividadRead,
    RegistrarJornadaRequest,
    to_constancia,
    to_horas_actividad,
)
from app.entities.activity import Activity
from app.entities.participation import EstadoParticipacion
from app.entities.registro_horas import MAX_MOTIVO_RECLAMO, EstadoHoras, RegistroHoras
from app.exceptions import (
    ActividadNoTerminadaException,
    ActivityNotFoundException,
    FechaJornadaInvalidaException,
    ForbiddenException,
    HorasInvalidasException,
    HorasYaConfirmadasException,
    JornadaYaRegistradaException,
    MotivoReclamoObligatorioException,
    NoEsParticipanteAceptadoException,
    RegistroHorasNoPendienteException,
    RegistroHorasNotFoundException,
    ValidationException,
)
from app.repositories.activity_repository import ActivityRepository
from app.repositories.participation_repository import ParticipationRepository
from app.repositories.registro_horas_repository import RegistroHorasRepository
from app.repositories.user_repository import UserRepository
from app.services.activity_guards import ensure_not_cancelled, ensure_owner, get_activity_or_404

MAX_HORAS_JORNADA = 24


class HorasService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.activities = ActivityRepository(session)
        self.participations = ParticipationRepository(session)
        self.registros = RegistroHorasRepository(session)
        self.users = UserRepository(session)

    # ══════════════════════════════════════════════════════════════════════════
    # Consultas
    # ══════════════════════════════════════════════════════════════════════════
    def horas_de_actividad(self, activity_id: UUID, user_id: str) -> HorasActividadRead:
        """El organizador ve todos los registros; el voluntario solo los suyos."""
        activity = get_activity_or_404(self.activities, activity_id)
        es_organizador = activity.is_owner(user_id)
        if activity.is_draft and not es_organizador:
            raise ActivityNotFoundException()

        registros = self.registros.find_by_activity(
            activity_id, user_id=None if es_organizador else user_id
        )
        return to_horas_actividad(
            activity,
            es_organizador=es_organizador,
            puede_registrar=es_organizador and activity.has_passed() and not activity.is_cancelled,
            aceptados=(
                self.participations.find_by_status(activity_id, EstadoParticipacion.ACEPTADA)
                if es_organizador
                else []
            ),
            registros=registros,
            total_confirmado=total_confirmado(registros),
        )

    def constancia(self, user_id: str, email: str) -> ConstanciaRead:
        """Solo horas confirmadas, agrupadas por actividad."""
        user = self.users.find_by_id(user_id)
        confirmadas = self.registros.find_confirmed_of_user(user_id)

        por_actividad: dict[UUID, tuple[Activity, list[RegistroHoras]]] = {}
        for registro in confirmadas:
            por_actividad.setdefault(registro.activity_id, (registro.activity, []))[1].append(registro)

        return to_constancia(
            voluntario=user.name if user else email,
            correo=user.email if user else email,
            actividades=[
                (activity, registros, total_confirmado(registros))
                for activity, registros in por_actividad.values()
            ],
            total_horas=total_confirmado(confirmadas),
        )

    # ══════════════════════════════════════════════════════════════════════════
    # La organización registra y corrige
    # ══════════════════════════════════════════════════════════════════════════
    def registrar_jornada(
        self, activity_id: UUID, organizador_id: str, datos: RegistrarJornadaRequest
    ) -> list[RegistroHoras]:
        """Crea un registro pendiente por cada participante aceptado de la lista."""
        # FOR UPDATE: dos registros de la misma jornada no se cruzan
        activity = get_activity_or_404(self.activities, activity_id, for_update=True)
        horas_por_participante = {r.user_id: r.horas for r in datos.registros}
        if len(horas_por_participante) != len(datos.registros):
            raise ValidationException("Cada participante puede aparecer una sola vez por jornada.")

        ensure_owner(activity, organizador_id, "Solo el organizador puede registrar horas.")
        ensure_not_cancelled(activity)
        if not activity.has_passed():
            raise ActividadNoTerminadaException()
        if not (dia_en_bolivia(activity.date) <= datos.jornada <= hoy_en_bolivia()):
            raise FechaJornadaInvalidaException()
        if not horas_por_participante:
            raise ValidationException("Indica las horas de al menos un participante.")

        aceptados = {
            p.user_id
            for p in self.participations.find_by_status(activity.id, EstadoParticipacion.ACEPTADA)
        }
        ya_registrados = {
            r.user_id
            for r in self.registros.find_by_activity(activity.id)
            if r.jornada == datos.jornada
        }

        nuevos = []
        for user_id, horas in horas_por_participante.items():
            if user_id not in aceptados:
                raise NoEsParticipanteAceptadoException()
            if user_id in ya_registrados:
                raise JornadaYaRegistradaException()
            nuevos.append(
                RegistroHoras(
                    activity_id=activity.id,
                    user_id=user_id,
                    jornada=datos.jornada,
                    horas=validate_horas(horas),
                    estado=EstadoHoras.PENDIENTE.value,
                )
            )
        self.registros.save_all(nuevos)
        self.session.commit()
        return nuevos

    def corregir(self, registro_id: UUID, organizador_id: str, horas: float) -> None:
        """Nuevas horas: el registro vuelve a pendiente y necesita otra aceptación."""
        registro = self._registro_o_404(registro_id)
        activity = get_activity_or_404(self.activities, registro.activity_id)
        ensure_owner(activity, organizador_id, "Solo el organizador puede corregir las horas.")
        if registro.esta_confirmada:
            raise HorasYaConfirmadasException()
        registro.horas_anteriores = registro.horas
        registro.horas = validate_horas(horas)
        registro.estado = EstadoHoras.PENDIENTE.value
        self.session.commit()

    # ══════════════════════════════════════════════════════════════════════════
    # El voluntario responde
    # ══════════════════════════════════════════════════════════════════════════
    def aceptar(self, registro_id: UUID, user_id: str) -> None:
        registro = self._registro_pendiente_del_voluntario(registro_id, user_id)
        registro.estado = EstadoHoras.CONFIRMADA.value
        self.session.commit()

    def reclamar(self, registro_id: UUID, user_id: str, motivo: str) -> None:
        registro = self._registro_pendiente_del_voluntario(registro_id, user_id)
        motivo_limpio = (motivo or "").strip()
        if not motivo_limpio:
            raise MotivoReclamoObligatorioException()
        if len(motivo_limpio) > MAX_MOTIVO_RECLAMO:
            raise ValidationException(
                f"El motivo no puede superar los {MAX_MOTIVO_RECLAMO} caracteres."
            )
        registro.estado = EstadoHoras.RECLAMADA.value
        registro.motivo_reclamo = motivo_limpio
        self.session.commit()

    # ── Privados ──────────────────────────────────────────────────────────────
    def _registro_o_404(self, registro_id: UUID) -> RegistroHoras:
        registro = self.registros.find_by_id(registro_id)
        if registro is None:
            raise RegistroHorasNotFoundException()
        return registro

    def _registro_pendiente_del_voluntario(self, registro_id: UUID, user_id: str) -> RegistroHoras:
        registro = self._registro_o_404(registro_id)
        if registro.user_id != user_id:
            raise ForbiddenException("Solo el voluntario puede responder sus horas.")
        if registro.estado != EstadoHoras.PENDIENTE:
            raise RegistroHorasNoPendienteException()
        return registro


def validate_horas(horas: float) -> float:
    if isinstance(horas, bool) or not isinstance(horas, (int, float)):
        raise HorasInvalidasException()
    if not (0 < horas <= MAX_HORAS_JORNADA):
        raise HorasInvalidasException()
    return round(float(horas), 2)


def total_confirmado(registros: list[RegistroHoras]) -> float:
    """Solo las horas confirmadas suman."""
    return round(sum(r.horas for r in registros if r.esta_confirmada), 2)
