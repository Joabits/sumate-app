from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.activities.domain.exceptions import ActivityNotFoundException
from app.modules.participations.application.use_cases.join_activity import (
    JoinActivityCommand,
    JoinActivityUseCase,
)
from app.modules.participations.application.use_cases.leave_activity import (
    LeaveActivityCommand,
    LeaveActivityUseCase,
)
from app.modules.participations.application.use_cases.revisar_solicitud import (
    AceptarSolicitudUseCase,
    RechazarSolicitudUseCase,
    RevisarSolicitudCommand,
)
from app.modules.participations.domain.entities.participation import (
    EstadoParticipacion,
    Participation,
)
from app.modules.participations.domain.exceptions import (
    ActivityCapacityExceededException,
    CannotJoinPastActivityException,
    NoEsOrganizadorException,
    ParticipationNotFoundException,
    SolicitudRechazadaException,
    SolicitudYaRevisadaException,
)

ORGANIZADOR_ID = "organizador_1"
VOLUNTARIO_ID = "voluntario_1"


def crear_actividad(*, dias: int = 2, cupos: int = 10) -> Activity:
    return Activity(
        id=uuid4(),
        name="Taller Comunitario",
        owner_id=ORGANIZADOR_ID,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=dias),
        capacity=cupos,
        status=ActivityStatus.ACTIVE,
    )


def crear_solicitud(actividad: Activity, estado: EstadoParticipacion) -> Participation:
    return Participation(
        id=uuid4(),
        activity_id=actividad.id,
        user_id=VOLUNTARIO_ID,
        estado=estado,
    )


def crear_repos(
    actividad: Activity | None, solicitud: Participation | None, aceptados: int = 0
):
    repo_actividades = MagicMock()
    repo_actividades.get_by_id.return_value = actividad
    repo_participaciones = MagicMock()
    repo_participaciones.get_by_activity_and_user.return_value = solicitud
    repo_participaciones.count_by_activity_id.return_value = aceptados
    return repo_actividades, repo_participaciones, MagicMock()


def comando_revision(actividad: Activity, organizador_id: str = ORGANIZADOR_ID):
    return RevisarSolicitudCommand(
        activity_id=actividad.id,
        participante_id=VOLUNTARIO_ID,
        organizador_id=organizador_id,
    )


# ── Entidad ───────────────────────────────────────────────────────────────────
def test_nueva_participacion_nace_pendiente():
    participacion = Participation.create(activity_id=uuid4(), user_id=VOLUNTARIO_ID)
    assert participacion.estado == EstadoParticipacion.PENDIENTE


@pytest.mark.parametrize(
    "estado", [EstadoParticipacion.ACEPTADA, EstadoParticipacion.RECHAZADA]
)
def test_solicitud_revisada_no_se_puede_revisar_otra_vez(estado):
    participacion = Participation(
        id=uuid4(), activity_id=uuid4(), user_id=VOLUNTARIO_ID, estado=estado
    )
    with pytest.raises(SolicitudYaRevisadaException):
        participacion.aceptar()
    with pytest.raises(SolicitudYaRevisadaException):
        participacion.rechazar()


# ── Solicitar ─────────────────────────────────────────────────────────────────
def test_solicitar_crea_solicitud_pendiente():
    actividad = crear_actividad()
    repo_act, repo_part, uow = crear_repos(actividad, None)

    participacion = JoinActivityUseCase(repo_act, repo_part, uow).execute(
        JoinActivityCommand(activity_id=actividad.id, user_id=VOLUNTARIO_ID)
    )

    assert participacion.estado == EstadoParticipacion.PENDIENTE
    repo_part.save.assert_called_once_with(participacion)
    uow.commit.assert_called_once()


def test_rechazado_no_puede_volver_a_solicitar():
    actividad = crear_actividad()
    rechazada = crear_solicitud(actividad, EstadoParticipacion.RECHAZADA)
    repo_act, repo_part, uow = crear_repos(actividad, rechazada)

    with pytest.raises(SolicitudRechazadaException):
        JoinActivityUseCase(repo_act, repo_part, uow).execute(
            JoinActivityCommand(activity_id=actividad.id, user_id=VOLUNTARIO_ID)
        )
    repo_part.save.assert_not_called()


def test_rechazado_no_puede_borrar_su_solicitud_para_reintentar():
    actividad = crear_actividad()
    rechazada = crear_solicitud(actividad, EstadoParticipacion.RECHAZADA)
    repo_act, repo_part, uow = crear_repos(actividad, rechazada)

    with pytest.raises(ParticipationNotFoundException):
        LeaveActivityUseCase(repo_act, repo_part, uow).execute(
            LeaveActivityCommand(activity_id=actividad.id, user_id=VOLUNTARIO_ID)
        )
    repo_part.delete.assert_not_called()


def test_solicitud_pendiente_se_puede_cancelar():
    actividad = crear_actividad()
    pendiente = crear_solicitud(actividad, EstadoParticipacion.PENDIENTE)
    repo_act, repo_part, uow = crear_repos(actividad, pendiente)
    repo_part.delete.return_value = True

    LeaveActivityUseCase(repo_act, repo_part, uow).execute(
        LeaveActivityCommand(activity_id=actividad.id, user_id=VOLUNTARIO_ID)
    )
    repo_part.delete.assert_called_once_with(actividad.id, VOLUNTARIO_ID)
    uow.commit.assert_called_once()


# ── Aceptar ───────────────────────────────────────────────────────────────────
def test_organizador_acepta_solicitud_pendiente():
    actividad = crear_actividad(cupos=3)
    pendiente = crear_solicitud(actividad, EstadoParticipacion.PENDIENTE)
    repo_act, repo_part, uow = crear_repos(actividad, pendiente, aceptados=2)

    resultado = AceptarSolicitudUseCase(repo_act, repo_part, uow).execute(
        comando_revision(actividad)
    )

    assert resultado.estado == EstadoParticipacion.ACEPTADA
    repo_act.get_by_id.assert_called_once_with(actividad.id, for_update=True)
    repo_part.save.assert_called_once_with(pendiente)
    uow.commit.assert_called_once()


def test_aceptar_falla_si_no_quedan_cupos():
    actividad = crear_actividad(cupos=3)
    pendiente = crear_solicitud(actividad, EstadoParticipacion.PENDIENTE)
    repo_act, repo_part, uow = crear_repos(actividad, pendiente, aceptados=3)

    with pytest.raises(ActivityCapacityExceededException):
        AceptarSolicitudUseCase(repo_act, repo_part, uow).execute(
            comando_revision(actividad)
        )
    assert pendiente.estado == EstadoParticipacion.PENDIENTE
    uow.commit.assert_not_called()


def test_aceptar_falla_si_la_actividad_ya_paso():
    actividad = crear_actividad()
    actividad.date = datetime.now(timezone.utc) - timedelta(days=1)
    pendiente = crear_solicitud(actividad, EstadoParticipacion.PENDIENTE)
    repo_act, repo_part, uow = crear_repos(actividad, pendiente)

    with pytest.raises(CannotJoinPastActivityException):
        AceptarSolicitudUseCase(repo_act, repo_part, uow).execute(
            comando_revision(actividad)
        )
    uow.commit.assert_not_called()


# ── Rechazar ──────────────────────────────────────────────────────────────────
def test_organizador_rechaza_solicitud_pendiente():
    actividad = crear_actividad()
    pendiente = crear_solicitud(actividad, EstadoParticipacion.PENDIENTE)
    repo_act, repo_part, uow = crear_repos(actividad, pendiente)

    resultado = RechazarSolicitudUseCase(repo_act, repo_part, uow).execute(
        comando_revision(actividad)
    )

    assert resultado.estado == EstadoParticipacion.RECHAZADA
    repo_part.save.assert_called_once_with(pendiente)
    uow.commit.assert_called_once()


# ── Permisos y errores comunes ────────────────────────────────────────────────
CASOS_DE_USO = [AceptarSolicitudUseCase, RechazarSolicitudUseCase]


@pytest.mark.parametrize("caso_de_uso", CASOS_DE_USO)
def test_solo_el_organizador_puede_revisar(caso_de_uso):
    actividad = crear_actividad()
    pendiente = crear_solicitud(actividad, EstadoParticipacion.PENDIENTE)
    repo_act, repo_part, uow = crear_repos(actividad, pendiente)

    with pytest.raises(NoEsOrganizadorException):
        caso_de_uso(repo_act, repo_part, uow).execute(
            comando_revision(actividad, organizador_id="intruso")
        )
    repo_part.save.assert_not_called()
    uow.commit.assert_not_called()


@pytest.mark.parametrize("caso_de_uso", CASOS_DE_USO)
def test_revisar_falla_si_no_existe_la_solicitud(caso_de_uso):
    actividad = crear_actividad()
    repo_act, repo_part, uow = crear_repos(actividad, None)

    with pytest.raises(ParticipationNotFoundException):
        caso_de_uso(repo_act, repo_part, uow).execute(comando_revision(actividad))


@pytest.mark.parametrize("caso_de_uso", CASOS_DE_USO)
def test_revisar_falla_si_no_existe_la_actividad(caso_de_uso):
    actividad = crear_actividad()
    repo_act, repo_part, uow = crear_repos(None, None)

    with pytest.raises(ActivityNotFoundException):
        caso_de_uso(repo_act, repo_part, uow).execute(comando_revision(actividad))


@pytest.mark.parametrize("caso_de_uso", CASOS_DE_USO)
def test_solicitud_ya_revisada_no_cambia(caso_de_uso):
    actividad = crear_actividad()
    aceptada = crear_solicitud(actividad, EstadoParticipacion.ACEPTADA)
    repo_act, repo_part, uow = crear_repos(actividad, aceptada, aceptados=1)

    with pytest.raises(SolicitudYaRevisadaException):
        caso_de_uso(repo_act, repo_part, uow).execute(comando_revision(actividad))
    uow.commit.assert_not_called()
