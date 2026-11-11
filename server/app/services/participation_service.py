"""
Solicitudes para participar en una actividad.

    pendiente ──aceptar──▶ aceptada
        └────rechazar──▶ rechazada
    en_espera ──se libera un cupo──▶ aceptada
    pendiente/aceptada/en_espera ──la organización cancela──▶ cancelada
"""

from uuid import UUID

from sqlmodel import Session

from app.dtos.participation_dto import ParticipatedActivityListRead, to_trayectoria
from app.entities.activity import Activity
from app.entities.participation import (
    ESTADOS_QUE_SE_CANCELAN,
    EstadoParticipacion,
    Participation,
)
from app.exceptions import (
    ActivityCapacityExceededException,
    AlreadyParticipatingException,
    CannotJoinInactiveActivityException,
    CannotJoinOwnActivityException,
    CannotJoinPastActivityException,
    CannotLeavePastActivityException,
    NoEsOrganizadorException,
    NoEstaEnListaDeEsperaException,
    ParticipationNotFoundException,
    SolicitudRechazadaException,
    SolicitudYaRevisadaException,
)
from app.repositories.activity_repository import ActivityRepository
from app.repositories.cause_repository import CauseRepository
from app.repositories.participation_repository import ParticipationRepository
from app.services.activity_guards import ensure_not_cancelled, get_activity_or_404


class ParticipationService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.activities = ActivityRepository(session)
        self.participations = ParticipationRepository(session)
        self.causes = CauseRepository(session)

    # ══════════════════════════════════════════════════════════════════════════
    # Casos de uso (cada uno hace su commit)
    # ══════════════════════════════════════════════════════════════════════════
    def listar_mis_solicitudes(self, user_id: str) -> ParticipatedActivityListRead:
        participations = self.participations.find_of_user_with_activity(user_id)
        activity_ids = [p.activity_id for p in participations]
        return to_trayectoria(participations, self.causes.find_by_activities(activity_ids))

    def solicitar(self, activity_id: UUID, user_id: str) -> Participation:
        """
        El voluntario solicita participar. Si hay cupos la solicitud queda
        pendiente; si están llenos, entra a la lista de espera.
        """
        # FOR UPDATE: dos voluntarios no toman el último cupo a la vez
        activity = get_activity_or_404(self.activities, activity_id, for_update=True)
        if activity.owner_id == user_id:
            raise CannotJoinOwnActivityException()
        # Una actividad cancelada ya no recibe solicitudes
        ensure_not_cancelled(activity)
        if not activity.is_active:
            raise CannotJoinInactiveActivityException()
        if activity.has_passed():
            raise CannotJoinPastActivityException()

        existente = self.participations.find_of_user(activity.id, user_id)
        if existente is not None:
            if existente.estado == EstadoParticipacion.RECHAZADA:
                raise SolicitudRechazadaException()
            raise AlreadyParticipatingException()

        lleno = self.participations.count_accepted(activity.id) >= activity.capacity
        estado = EstadoParticipacion.EN_ESPERA if lleno else EstadoParticipacion.PENDIENTE
        solicitud = self.participations.save(
            Participation(activity_id=activity.id, user_id=user_id, status=estado.value)
        )
        self.session.commit()
        return solicitud

    def salir(self, activity_id: UUID, user_id: str) -> None:
        """El voluntario retira su solicitud. Si ocupaba un cupo, entra el primero en espera."""
        # FOR UPDATE: nadie más toma el cupo mientras entra el primero en espera
        activity = get_activity_or_404(self.activities, activity_id, for_update=True)
        # Las solicitudes de una actividad cancelada se conservan en el historial
        ensure_not_cancelled(activity)
        if activity.has_passed():
            raise CannotLeavePastActivityException()

        solicitud = self.participations.find_of_user(activity_id, user_id)
        # Una solicitud rechazada no se puede borrar: así no se puede volver a solicitar
        if solicitud is None or solicitud.estado == EstadoParticipacion.RECHAZADA:
            raise ParticipationNotFoundException()

        ocupaba_cupo = solicitud.estado == EstadoParticipacion.ACEPTADA
        self.participations.delete(solicitud)
        if ocupaba_cupo:
            self.llenar_cupos_desde_lista_de_espera(activity)
        self.session.commit()

    def aceptar_solicitud(self, activity_id: UUID, participante_id: str, organizador_id: str) -> None:
        """El organizador acepta la solicitud si la actividad no pasó y quedan cupos."""
        activity, solicitud = self._solicitud_a_revisar(activity_id, participante_id, organizador_id)
        if activity.has_passed():
            raise CannotJoinPastActivityException()
        if self.participations.count_accepted(activity.id) >= activity.capacity:
            raise ActivityCapacityExceededException()
        if solicitud.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        solicitud.status = EstadoParticipacion.ACEPTADA.value
        self.session.commit()

    def rechazar_solicitud(self, activity_id: UUID, participante_id: str, organizador_id: str) -> None:
        _, solicitud = self._solicitud_a_revisar(activity_id, participante_id, organizador_id)
        if solicitud.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        solicitud.status = EstadoParticipacion.RECHAZADA.value
        self.session.commit()

    # ══════════════════════════════════════════════════════════════════════════
    # Reglas que también usa ActivityService (no hacen commit)
    # ══════════════════════════════════════════════════════════════════════════
    def llenar_cupos_desde_lista_de_espera(self, activity: Activity) -> list[Participation]:
        """
        Mientras haya cupos libres, la primera solicitud en espera pasa a aceptada.
        Se usa cuando alguien aceptado sale y cuando el organizador agrega cupos.
        La actividad debe venir bloqueada (FOR UPDATE); el commit lo hace quien llama.
        """
        # Una actividad cancelada no hace entrar a nadie de la lista de espera
        if activity.is_cancelled:
            return []
        self.participations.flush()
        cupos_libres = activity.capacity - self.participations.count_accepted(activity.id)
        if cupos_libres <= 0:
            return []
        entran = self.participations.find_waiting(activity.id)[:cupos_libres]
        for solicitud in entran:
            if solicitud.estado != EstadoParticipacion.EN_ESPERA:
                raise NoEstaEnListaDeEsperaException()
            solicitud.status = EstadoParticipacion.ACEPTADA.value
        return entran

    def cancelar_solicitudes_de(self, activity: Activity) -> None:
        """La actividad se canceló: cada solicitud viva queda cancelada y guarda su estado anterior."""
        for solicitud in self.participations.find_applicants(activity.id):
            if solicitud.estado not in ESTADOS_QUE_SE_CANCELAN:
                raise SolicitudYaRevisadaException()
            solicitud.estado_anterior = solicitud.status
            solicitud.status = EstadoParticipacion.CANCELADA.value

    # ── Privados ──────────────────────────────────────────────────────────────
    def _solicitud_a_revisar(
        self, activity_id: UUID, participante_id: str, organizador_id: str
    ) -> tuple[Activity, Participation]:
        """Solo el organizador revisa las solicitudes de su actividad, si no está cancelada."""
        # FOR UPDATE sobre la actividad serializa las aceptaciones simultáneas
        activity = get_activity_or_404(self.activities, activity_id, for_update=True)
        if not activity.is_owner(organizador_id):
            raise NoEsOrganizadorException()
        # Después de cancelar no se acepta ni se rechaza a nadie
        ensure_not_cancelled(activity)
        solicitud = self.participations.find_of_user(activity_id, participante_id)
        if solicitud is None:
            raise ParticipationNotFoundException()
        return activity, solicitud
