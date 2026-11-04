from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID, uuid4

from app.modules.participations.domain.exceptions import (
    NoEstaEnListaDeEsperaException,
    SolicitudYaRevisadaException,
)


class EstadoParticipacion(StrEnum):
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    # Los cupos estaban llenos: espera a que alguien cancele
    EN_ESPERA = "en_espera"
    # La organización canceló la actividad
    CANCELADA = "cancelada"


# Solicitudes que pasan a canceladas cuando la organización cancela la actividad
ESTADOS_QUE_SE_CANCELAN = (
    EstadoParticipacion.PENDIENTE,
    EstadoParticipacion.ACEPTADA,
    EstadoParticipacion.EN_ESPERA,
)


@dataclass
class Participation:
    id: UUID
    activity_id: UUID
    user_id: str
    estado: EstadoParticipacion = EstadoParticipacion.PENDIENTE
    # Estado que tenía antes de que la organización cancelara la actividad
    estado_anterior: EstadoParticipacion | None = None

    @classmethod
    def create(
        cls,
        activity_id: UUID,
        user_id: str,
    ) -> "Participation":
        """Toda participación nace como solicitud pendiente de revisión del organizador."""
        return cls(
            id=uuid4(),
            activity_id=activity_id,
            user_id=user_id,
            estado=EstadoParticipacion.PENDIENTE,
        )

    @classmethod
    def crear_en_espera(
        cls,
        activity_id: UUID,
        user_id: str,
    ) -> "Participation":
        """Con los cupos llenos la solicitud entra a la lista de espera."""
        return cls(
            id=uuid4(),
            activity_id=activity_id,
            user_id=user_id,
            estado=EstadoParticipacion.EN_ESPERA,
        )

    def aceptar(self) -> None:
        if self.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        self.estado = EstadoParticipacion.ACEPTADA

    def rechazar(self) -> None:
        if self.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        self.estado = EstadoParticipacion.RECHAZADA

    def cancelar_por_organizacion(self) -> None:
        """La actividad se canceló: la solicitud queda cancelada y guarda su estado anterior."""
        if self.estado not in ESTADOS_QUE_SE_CANCELAN:
            raise SolicitudYaRevisadaException()
        self.estado_anterior = self.estado
        self.estado = EstadoParticipacion.CANCELADA

    def ocupar_cupo_liberado(self) -> None:
        """Se liberó un cupo y esta solicitud era la primera en espera: queda aceptada."""
        if self.estado != EstadoParticipacion.EN_ESPERA:
            raise NoEstaEnListaDeEsperaException()
        self.estado = EstadoParticipacion.ACEPTADA
