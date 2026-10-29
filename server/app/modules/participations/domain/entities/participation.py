from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID, uuid4

from app.modules.participations.domain.exceptions import SolicitudYaRevisadaException


class EstadoParticipacion(StrEnum):
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"


@dataclass
class Participation:
    id: UUID
    activity_id: UUID
    user_id: str
    estado: EstadoParticipacion = EstadoParticipacion.PENDIENTE

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

    def aceptar(self) -> None:
        if self.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        self.estado = EstadoParticipacion.ACEPTADA

    def rechazar(self) -> None:
        if self.estado != EstadoParticipacion.PENDIENTE:
            raise SolicitudYaRevisadaException()
        self.estado = EstadoParticipacion.RECHAZADA
