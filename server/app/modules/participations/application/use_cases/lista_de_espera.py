from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.participations.domain.entities.participation import Participation
from app.modules.participations.domain.repositories.participation_repository import (
    ParticipationRepository,
)


def llenar_cupos_desde_lista_de_espera(
    actividad: Activity,
    participation_repository: ParticipationRepository,
) -> list[Participation]:
    """Mientras haya cupos libres, la primera solicitud en espera pasa a aceptada.

    Se usa cuando alguien aceptado cancela y cuando el organizador agrega cupos.
    Quien llama debe tener la actividad bloqueada (FOR UPDATE) y hacer el commit.
    """
    # Una actividad cancelada no hace entrar a nadie de la lista de espera
    if actividad.status == ActivityStatus.CANCELLED:
        return []

    aceptados = participation_repository.count_by_activity_id(actividad.id)
    cupos_libres = actividad.capacity - aceptados
    if cupos_libres <= 0:
        return []

    en_espera = participation_repository.listar_en_espera(actividad.id)
    entran = list(en_espera)[:cupos_libres]
    for solicitud in entran:
        solicitud.ocupar_cupo_liberado()
        participation_repository.save(solicitud)
    return entran
