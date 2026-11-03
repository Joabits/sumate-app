from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.modules.activities.application.queries.get_activity_detail import (
    GetActivityDetailQuery,
    GetActivityDetailQueryHandler,
)
from app.modules.activities.application.use_cases.update_activity_capacity import (
    UpdateActivityCapacityCommand,
    UpdateActivityCapacityUseCase,
)
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.participations.application.use_cases.join_activity import (
    JoinActivityCommand,
    JoinActivityUseCase,
)
from app.modules.participations.application.use_cases.leave_activity import (
    LeaveActivityCommand,
    LeaveActivityUseCase,
)
from app.modules.participations.domain.entities.participation import (
    EstadoParticipacion,
    Participation,
)
from app.modules.participations.domain.exceptions import (
    NoEstaEnListaDeEsperaException,
)

ORGANIZADOR_ID = "organizador_1"


def crear_actividad(*, cupos: int) -> Activity:
    return Activity(
        id=uuid4(),
        name="Taller de primeros auxilios",
        owner_id=ORGANIZADOR_ID,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=3),
        capacity=cupos,
        status=ActivityStatus.ACTIVE,
    )


def crear_solicitud(actividad: Activity, user_id: str, estado: EstadoParticipacion):
    return Participation(
        id=uuid4(), activity_id=actividad.id, user_id=user_id, estado=estado
    )


def crear_repos(actividad: Activity, aceptados: int, en_espera: list[Participation]):
    repo_actividades = MagicMock()
    repo_actividades.get_by_id.return_value = actividad
    repo_participaciones = MagicMock()
    repo_participaciones.count_by_activity_id.return_value = aceptados
    repo_participaciones.listar_en_espera.return_value = en_espera
    return repo_actividades, repo_participaciones, MagicMock()


# ── Entidad ───────────────────────────────────────────────────────────────────
def test_solicitud_en_espera_pasa_a_aceptada_al_liberarse_un_cupo():
    actividad = crear_actividad(cupos=1)
    solicitud = crear_solicitud(actividad, "sofia", EstadoParticipacion.EN_ESPERA)

    solicitud.ocupar_cupo_liberado()

    assert solicitud.estado == EstadoParticipacion.ACEPTADA


@pytest.mark.parametrize(
    "estado",
    [EstadoParticipacion.PENDIENTE, EstadoParticipacion.ACEPTADA, EstadoParticipacion.RECHAZADA],
)
def test_solo_una_solicitud_en_espera_puede_ocupar_un_cupo_liberado(estado):
    actividad = crear_actividad(cupos=1)
    solicitud = crear_solicitud(actividad, "sofia", estado)

    with pytest.raises(NoEstaEnListaDeEsperaException):
        solicitud.ocupar_cupo_liberado()
    assert solicitud.estado == estado


# ── Solicitar participar ──────────────────────────────────────────────────────
def test_con_cupos_llenos_la_solicitud_queda_en_espera():
    actividad = crear_actividad(cupos=1)
    repo_act, repo_part, uow = crear_repos(actividad, aceptados=1, en_espera=[])
    repo_part.get_by_activity_and_user.return_value = None

    solicitud = JoinActivityUseCase(repo_act, repo_part, uow).execute(
        JoinActivityCommand(activity_id=actividad.id, user_id="sofia")
    )

    assert solicitud.estado == EstadoParticipacion.EN_ESPERA
    repo_part.save.assert_called_once_with(solicitud)
    uow.commit.assert_called_once()


def test_con_cupos_libres_la_solicitud_queda_pendiente():
    actividad = crear_actividad(cupos=2)
    repo_act, repo_part, uow = crear_repos(actividad, aceptados=1, en_espera=[])
    repo_part.get_by_activity_and_user.return_value = None

    solicitud = JoinActivityUseCase(repo_act, repo_part, uow).execute(
        JoinActivityCommand(activity_id=actividad.id, user_id="sofia")
    )

    assert solicitud.estado == EstadoParticipacion.PENDIENTE


# ── Cancelar ──────────────────────────────────────────────────────────────────
def test_si_cancela_un_aceptado_entra_el_primero_en_espera():
    actividad = crear_actividad(cupos=1)
    luis = crear_solicitud(actividad, "luis", EstadoParticipacion.ACEPTADA)
    sofia = crear_solicitud(actividad, "sofia", EstadoParticipacion.EN_ESPERA)
    carlos = crear_solicitud(actividad, "carlos", EstadoParticipacion.EN_ESPERA)
    # Después de borrar a Luis quedan 0 aceptados y un cupo libre
    repo_act, repo_part, uow = crear_repos(actividad, aceptados=0, en_espera=[sofia, carlos])
    repo_part.get_by_activity_and_user.return_value = luis
    repo_part.delete.return_value = True

    LeaveActivityUseCase(repo_act, repo_part, uow).execute(
        LeaveActivityCommand(activity_id=actividad.id, user_id="luis")
    )

    assert sofia.estado == EstadoParticipacion.ACEPTADA
    assert carlos.estado == EstadoParticipacion.EN_ESPERA
    repo_part.save.assert_called_once_with(sofia)
    repo_act.get_by_id.assert_called_once_with(actividad.id, for_update=True)
    uow.commit.assert_called_once()


def test_si_sale_alguien_de_la_lista_de_espera_no_entra_nadie():
    actividad = crear_actividad(cupos=1)
    sofia = crear_solicitud(actividad, "sofia", EstadoParticipacion.EN_ESPERA)
    carlos = crear_solicitud(actividad, "carlos", EstadoParticipacion.EN_ESPERA)
    repo_act, repo_part, uow = crear_repos(actividad, aceptados=1, en_espera=[carlos])
    repo_part.get_by_activity_and_user.return_value = sofia
    repo_part.delete.return_value = True

    LeaveActivityUseCase(repo_act, repo_part, uow).execute(
        LeaveActivityCommand(activity_id=actividad.id, user_id="sofia")
    )

    assert carlos.estado == EstadoParticipacion.EN_ESPERA
    repo_part.save.assert_not_called()
    uow.commit.assert_called_once()


# ── Agregar cupos ─────────────────────────────────────────────────────────────
def test_al_agregar_cupos_entran_los_primeros_en_espera_en_orden():
    actividad = crear_actividad(cupos=1)
    sofia = crear_solicitud(actividad, "sofia", EstadoParticipacion.EN_ESPERA)
    carlos = crear_solicitud(actividad, "carlos", EstadoParticipacion.EN_ESPERA)
    maria = crear_solicitud(actividad, "maria", EstadoParticipacion.EN_ESPERA)
    repo_act, repo_part, uow = crear_repos(actividad, aceptados=1, en_espera=[sofia, carlos, maria])

    UpdateActivityCapacityUseCase(repo_act, repo_part, uow).execute(
        UpdateActivityCapacityCommand(
            activity_id=actividad.id, owner_id=ORGANIZADOR_ID, capacity=3
        )
    )

    assert sofia.estado == EstadoParticipacion.ACEPTADA
    assert carlos.estado == EstadoParticipacion.ACEPTADA
    assert maria.estado == EstadoParticipacion.EN_ESPERA
    uow.commit.assert_called_once()


# ── Detalle ───────────────────────────────────────────────────────────────────
def test_el_voluntario_ve_su_puesto_y_el_organizador_la_lista_completa():
    actividad = crear_actividad(cupos=1)
    repo_act = MagicMock()
    repo_act.get_detail_by_activity_id.return_value = (actividad, None)
    repo_act.get_causes_by_activity_id.return_value = []
    repo_part = MagicMock()
    repo_part.get_by_activity_and_user.return_value = crear_solicitud(
        actividad, "carlos", EstadoParticipacion.EN_ESPERA
    )

    def listar(activity_id, estado):
        if estado == EstadoParticipacion.EN_ESPERA:
            return [
                (crear_solicitud(actividad, "sofia", estado), "Sofía Vargas", None),
                (crear_solicitud(actividad, "carlos", estado), "Carlos Quispe", None),
            ]
        return []

    repo_part.list_participants_by_activity_id.side_effect = listar
    handler = GetActivityDetailQueryHandler(repo_act, repo_part)

    voluntario = handler.execute(
        GetActivityDetailQuery(activity_id=actividad.id, current_user_id="carlos")
    )
    assert voluntario.estado_solicitud == "en_espera"
    assert voluntario.posicion_en_espera == 2
    assert voluntario.lista_de_espera == []

    repo_part.get_by_activity_and_user.return_value = None
    organizador = handler.execute(
        GetActivityDetailQuery(activity_id=actividad.id, current_user_id=ORGANIZADOR_ID)
    )
    assert [p.name for p in organizador.lista_de_espera] == ["Sofía Vargas", "Carlos Quispe"]
