"""
Mis datos y eliminar la cuenta (Tarea 10).

La regla de Voluntariado Cerca al eliminar la cuenta:

- Las horas confirmadas se conservan en el registro de cada organización,
  sin datos personales (el voluntario pasa a ser «Usuario eliminado»).
- Las solicitudes pendientes y en lista de espera se retiran. Un cupo aceptado
  en una actividad que no pasó también se libera y entra el primero en espera.
- Las horas sin confirmar (pendientes o en reclamo) se borran: nunca fueron
  parte de una constancia y el motivo del reclamo es texto de la persona.
- Si organiza actividades que todavía no terminan, no se elimina: hay
  voluntarios que dependen de ellas. El mensaje dice cuáles y qué hacer.
- Al final se borra la fila de Better Auth (con sus sesiones y cuentas), así
  esa cuenta ya no puede iniciar sesión.
"""

from uuid import uuid4

from sqlmodel import Session

from app.dtos.cuenta_dto import CuentaEliminadaRead, MisDatosRead, to_mis_datos
from app.entities.activity import Activity
from app.entities.participation import EstadoParticipacion
from app.entities.user import User
from app.exceptions import CuentaConActividadesPorTerminarException
from app.repositories.activity_repository import ActivityRepository
from app.repositories.participation_repository import ParticipationRepository
from app.repositories.registro_horas_repository import RegistroHorasRepository
from app.repositories.user_repository import UserRepository
from app.services.participation_service import ParticipationService

# Solicitudes que siguen vivas y se retiran al eliminar la cuenta
ESTADOS_QUE_SE_RETIRAN = (
    EstadoParticipacion.PENDIENTE,
    EstadoParticipacion.EN_ESPERA,
    EstadoParticipacion.ACEPTADA,
)


class CuentaService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.activities = ActivityRepository(session)
        self.participations = ParticipationRepository(session)
        self.registros = RegistroHorasRepository(session)
        self.users = UserRepository(session)
        self.solicitudes = ParticipationService(session)

    # ══════════════════════════════════════════════════════════════════════════
    # Consultas
    # ══════════════════════════════════════════════════════════════════════════
    def mis_datos(self, user_id: str, email: str) -> MisDatosRead:
        """Todo lo que la app guarda de la persona, para verlo y descargarlo."""
        user = self.users.find_by_id(user_id) or User(id=user_id, name="", email=email)
        organizadas = self.activities.find_by_owner(user_id)
        return to_mis_datos(
            user,
            organizadas,
            self.participations.find_all_of_user(user_id),
            self.registros.find_all_of_user(user_id),
            actividades_por_terminar(organizadas),
        )

    # ══════════════════════════════════════════════════════════════════════════
    # Caso de uso (hace commit)
    # ══════════════════════════════════════════════════════════════════════════
    def eliminar(self, user_id: str) -> CuentaEliminadaRead:
        organizadas = self.activities.find_by_owner(user_id)
        por_terminar = actividades_por_terminar(organizadas)
        if por_terminar:
            raise CuentaConActividadesPorTerminarException([a.name for a in por_terminar])

        # Un id que no lleva a nadie: une las filas que se conservan sin decir de quién eran
        anonimo = f"eliminado-{uuid4().hex}"
        retiradas, liberados = self._retirar_solicitudes(user_id)
        conservadas = self._conservar_horas_confirmadas(user_id, anonimo)

        for solicitud in self.participations.find_all_of_user(user_id):
            solicitud.user_id = anonimo
            solicitud.motivo_retiro = None
        # Actividades que ya pasaron, canceladas o borradores: quedan sin organizador
        for activity in organizadas:
            activity.owner_id = anonimo

        user = self.users.find_by_id(user_id)
        if user is not None:
            self.users.delete(user)
        self.session.commit()
        return CuentaEliminadaRead(
            solicitudes_retiradas=retiradas,
            cupos_liberados=liberados,
            horas_confirmadas_conservadas=conservadas,
        )

    # ── Privados ──────────────────────────────────────────────────────────────
    def _retirar_solicitudes(self, user_id: str) -> tuple[int, int]:
        """Retira lo que sigue vivo en actividades que no pasaron. Devuelve (retiradas, cupos liberados)."""
        retiradas = 0
        liberados = 0
        for solicitud in self.participations.find_all_of_user(user_id):
            if solicitud.estado not in ESTADOS_QUE_SE_RETIRAN:
                continue
            # FOR UPDATE: nadie más toma el cupo mientras entra el primero en espera
            activity = self.activities.find_by_id(solicitud.activity_id, for_update=True)
            if activity is None or activity.is_cancelled:
                continue
            # Un aceptado en una actividad que ya pasó participó: se conserva por sus horas
            if solicitud.estado == EstadoParticipacion.ACEPTADA and activity.has_passed():
                continue
            era_aceptada = solicitud.estado == EstadoParticipacion.ACEPTADA
            solicitud.status = EstadoParticipacion.RETIRADA.value
            retiradas += 1
            if era_aceptada and self.solicitudes.llenar_cupos_desde_lista_de_espera(activity):
                liberados += 1
        return retiradas, liberados

    def _conservar_horas_confirmadas(self, user_id: str, anonimo: str) -> int:
        conservadas = 0
        for registro in self.registros.find_all_of_user(user_id):
            if registro.esta_confirmada:
                registro.user_id = anonimo
                registro.motivo_reclamo = None
                conservadas += 1
            else:
                self.registros.delete(registro)
        return conservadas


def actividades_por_terminar(organizadas: list[Activity]) -> list[Activity]:
    """Publicadas o cerradas que todavía no pasan: tienen voluntarios esperándolas."""
    return [a for a in organizadas if not a.is_cancelled and not a.is_draft and not a.has_passed()]
