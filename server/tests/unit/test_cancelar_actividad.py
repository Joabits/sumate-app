from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.modules.activities.application.queries.get_activity_detail import (
    GetActivityDetailQuery,
    GetActivityDetailQueryHandler,
)
from app.modules.activities.application.use_cases.cancelar_actividad import (
    CancelarActividadCommand,
    CancelarActividadUseCase,
)
from app.modules.activities.application.use_cases.delete_activity import (
    DeleteActivityCommand,
    DeleteActivityUseCase,
)
from app.modules.activities.domain.entities.activity import Activity, ActivityStatus
from app.modules.activities.domain.exceptions import (
    ActividadCanceladaException,
    MotivoCancelacionObligatorioException,
)
from app.modules.activities.infrastructure.persistence.models.activity_model import (
    ActivityModel,
)
from app.modules.activities.infrastructure.persistence.repositories.sqlmodel_activity_repository import (
    SQLModelActivityRepository,
)
from app.modules.participations.application.queries.list_user_participations import (
    ListUserParticipationsQuery,
    ListUserParticipationsQueryHandler,
)
from app.modules.participations.application.use_cases.join_activity import (
    JoinActivityCommand,
    JoinActivityUseCase,
)
from app.modules.participations.application.use_cases.leave_activity import (
    LeaveActivityCommand,
    LeaveActivityUseCase,
)
from app.modules.participations.application.use_cases.lista_de_espera import (
    llenar_cupos_desde_lista_de_espera,
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
from app.modules.participations.domain.exceptions import SolicitudYaRevisadaException
from app.modules.participations.infrastructure.persistence.models.participation_model import (
    ParticipationModel,
)
from app.modules.participations.infrastructure.persistence.repositories.sqlmodel_participation_repository import (
    SQLModelParticipationRepository,
)
from app.shared.domain.exceptions import ForbiddenException, ValidationException
from app.shared.infrastructure.db.better_auth import BetterAuthUser
from sqlmodel import Session, SQLModel, create_engine, select

ORGANIZADOR_ID = "organizador_1"
MOTIVO = "Se suspende por lluvia: el parque estará cerrado."


def crear_actividad(
    *, estado: ActivityStatus = ActivityStatus.ACTIVE, dias: int = 3, cupos: int = 1
) -> Activity:
    return Activity(
        id=uuid4(),
        name="Taller de huertos urbanos",
        owner_id=ORGANIZADOR_ID,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=dias),
        capacity=cupos,
        status=estado,
    )


def crear_solicitud(actividad: Activity, user_id: str, estado: EstadoParticipacion):
    return Participation(
        id=uuid4(), activity_id=actividad.id, user_id=user_id, estado=estado
    )


def cancelada() -> Activity:
    actividad = crear_actividad()
    actividad.cancelar(MOTIVO)
    return actividad


# ── Entidad: actividad ────────────────────────────────────────────────────────
def test_cancelar_guarda_el_motivo_y_cambia_el_estado():
    actividad = crear_actividad()

    actividad.cancelar("  " + MOTIVO + "  ")

    assert actividad.status == ActivityStatus.CANCELLED
    assert actividad.motivo_cancelacion == MOTIVO


@pytest.mark.parametrize("motivo", ["", "   ", None])
def test_el_motivo_es_obligatorio(motivo):
    actividad = crear_actividad()

    with pytest.raises(MotivoCancelacionObligatorioException):
        actividad.cancelar(motivo)
    assert actividad.status == ActivityStatus.ACTIVE


def test_un_borrador_no_se_cancela():
    with pytest.raises(ValidationException):
        crear_actividad(estado=ActivityStatus.DRAFT).cancelar(MOTIVO)


def test_una_actividad_que_ya_paso_no_se_cancela():
    with pytest.raises(ValidationException):
        crear_actividad(dias=-1).cancelar(MOTIVO)


def test_una_convocatoria_cerrada_se_puede_cancelar():
    actividad = crear_actividad(estado=ActivityStatus.CLOSED)
    actividad.cancelar(MOTIVO)
    assert actividad.status == ActivityStatus.CANCELLED


def test_no_se_cancela_dos_veces():
    with pytest.raises(ActividadCanceladaException):
        cancelada().cancelar("Otro motivo")


def test_una_actividad_cancelada_no_se_publica_ni_se_cierra():
    actividad = cancelada()
    with pytest.raises(ActividadCanceladaException):
        actividad.publish()
    with pytest.raises(ActividadCanceladaException):
        actividad.close()
    with pytest.raises(ValidationException):
        actividad.reopen()


# ── Entidad: solicitud ────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "estado",
    [EstadoParticipacion.PENDIENTE, EstadoParticipacion.ACEPTADA, EstadoParticipacion.EN_ESPERA],
)
def test_la_solicitud_cancelada_guarda_su_estado_anterior(estado):
    solicitud = crear_solicitud(crear_actividad(), "maria", estado)

    solicitud.cancelar_por_organizacion()

    assert solicitud.estado == EstadoParticipacion.CANCELADA
    assert solicitud.estado_anterior == estado


def test_una_solicitud_rechazada_no_cambia():
    solicitud = crear_solicitud(crear_actividad(), "carlos", EstadoParticipacion.RECHAZADA)

    with pytest.raises(SolicitudYaRevisadaException):
        solicitud.cancelar_por_organizacion()
    assert solicitud.estado == EstadoParticipacion.RECHAZADA


def test_una_solicitud_cancelada_no_se_acepta_ni_entra_desde_la_espera():
    solicitud = crear_solicitud(crear_actividad(), "maria", EstadoParticipacion.PENDIENTE)
    solicitud.cancelar_por_organizacion()

    with pytest.raises(SolicitudYaRevisadaException):
        solicitud.aceptar()


# ── Caso de uso con repositorios simulados ────────────────────────────────────
def test_cancelar_pasa_a_canceladas_las_solicitudes_en_los_tres_estados():
    actividad = crear_actividad()
    luis = crear_solicitud(actividad, "luis", EstadoParticipacion.ACEPTADA)
    maria = crear_solicitud(actividad, "maria", EstadoParticipacion.PENDIENTE)
    sofia = crear_solicitud(actividad, "sofia", EstadoParticipacion.EN_ESPERA)
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad
    repo_part.listar_postulantes.return_value = [luis, maria, sofia]

    afectadas = CancelarActividadUseCase(repo_act, repo_part, uow).execute(
        CancelarActividadCommand(
            activity_id=actividad.id, organizador_id=ORGANIZADOR_ID, motivo=MOTIVO
        )
    )

    assert afectadas == [luis, maria, sofia]
    assert [s.estado for s in afectadas] == [EstadoParticipacion.CANCELADA] * 3
    assert [s.estado_anterior for s in afectadas] == [
        EstadoParticipacion.ACEPTADA,
        EstadoParticipacion.PENDIENTE,
        EstadoParticipacion.EN_ESPERA,
    ]
    assert repo_part.save.call_count == 3
    repo_act.save.assert_called_once_with(actividad)
    repo_act.get_by_id.assert_called_once_with(actividad.id, for_update=True)
    uow.commit.assert_called_once()


def test_solo_el_organizador_puede_cancelar():
    actividad = crear_actividad()
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad

    with pytest.raises(ForbiddenException):
        CancelarActividadUseCase(repo_act, repo_part, uow).execute(
            CancelarActividadCommand(
                activity_id=actividad.id, organizador_id="otra_persona", motivo=MOTIVO
            )
        )
    assert actividad.status == ActivityStatus.ACTIVE
    uow.commit.assert_not_called()


def test_sin_motivo_no_se_cancela_nada():
    actividad = crear_actividad()
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad

    with pytest.raises(MotivoCancelacionObligatorioException):
        CancelarActividadUseCase(repo_act, repo_part, uow).execute(
            CancelarActividadCommand(
                activity_id=actividad.id, organizador_id=ORGANIZADOR_ID, motivo="  "
            )
        )
    repo_part.save.assert_not_called()
    uow.commit.assert_not_called()


# ── Bloqueos después de cancelar ──────────────────────────────────────────────
def test_despues_de_cancelar_nadie_puede_solicitar():
    actividad = cancelada()
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad

    with pytest.raises(ActividadCanceladaException):
        JoinActivityUseCase(repo_act, repo_part, uow).execute(
            JoinActivityCommand(activity_id=actividad.id, user_id="pedro")
        )
    repo_part.save.assert_not_called()


@pytest.mark.parametrize("caso_de_uso", [AceptarSolicitudUseCase, RechazarSolicitudUseCase])
def test_despues_de_cancelar_no_se_acepta_ni_se_rechaza(caso_de_uso):
    actividad = cancelada()
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad

    with pytest.raises(ActividadCanceladaException):
        caso_de_uso(repo_act, repo_part, uow).execute(
            RevisarSolicitudCommand(
                activity_id=actividad.id,
                participante_id="maria",
                organizador_id=ORGANIZADOR_ID,
            )
        )
    uow.commit.assert_not_called()


def test_despues_de_cancelar_nadie_entra_desde_la_lista_de_espera():
    actividad = cancelada()
    repo_part = MagicMock()
    repo_part.count_by_activity_id.return_value = 0

    assert llenar_cupos_desde_lista_de_espera(actividad, repo_part) == []
    repo_part.listar_en_espera.assert_not_called()


def test_despues_de_cancelar_la_solicitud_no_se_borra_del_historial():
    actividad = cancelada()
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad

    with pytest.raises(ActividadCanceladaException):
        LeaveActivityUseCase(repo_act, repo_part, uow).execute(
            LeaveActivityCommand(activity_id=actividad.id, user_id="luis")
        )
    repo_part.delete.assert_not_called()


def test_una_actividad_cancelada_no_se_elimina():
    actividad = cancelada()
    repo_act, repo_part, uow = MagicMock(), MagicMock(), MagicMock()
    repo_act.get_by_id.return_value = actividad

    with pytest.raises(ActividadCanceladaException):
        DeleteActivityUseCase(repo_act, repo_part, uow).execute(
            DeleteActivityCommand(activity_id=actividad.id, owner_id=ORGANIZADOR_ID)
        )
    repo_act.delete.assert_not_called()


# ── Datos guardados (base SQLite en memoria) ──────────────────────────────────
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


class UnidadDeTrabajo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def commit(self) -> None:
        self.session.commit()


def test_la_base_guarda_el_motivo_y_el_estado_anterior_de_cada_solicitud(db_session):
    db_session.add_all(
        [
            BetterAuthUser(id=ORGANIZADOR_ID, name="Ana Rojas", email="ana@example.com"),
            BetterAuthUser(id="luis", name="Luis Mamani", email="luis@example.com"),
            BetterAuthUser(id="maria", name="María López", email="maria@example.com"),
            BetterAuthUser(id="sofia", name="Sofía Vargas", email="sofia@example.com"),
            BetterAuthUser(id="carlos", name="Carlos Quispe", email="carlos@example.com"),
        ]
    )
    actividad = ActivityModel(
        id=uuid4(),
        name="Taller de huertos urbanos",
        owner_id=ORGANIZADOR_ID,
        image_url="http://localhost:8000/uploads/activities/test.webp",
        date=datetime.now(timezone.utc) + timedelta(days=4),
        capacity=1,
        status="active",
    )
    db_session.add(actividad)
    for user_id, estado in [
        ("luis", "aceptada"),
        ("maria", "pendiente"),
        ("sofia", "en_espera"),
        ("carlos", "rechazada"),
    ]:
        db_session.add(ParticipationModel(activity_id=actividad.id, user_id=user_id, status=estado))
    db_session.commit()

    repo_act = SQLModelActivityRepository(db_session)
    repo_part = SQLModelParticipationRepository(db_session)
    CancelarActividadUseCase(repo_act, repo_part, UnidadDeTrabajo(db_session)).execute(
        CancelarActividadCommand(
            activity_id=actividad.id, organizador_id=ORGANIZADOR_ID, motivo=MOTIVO
        )
    )

    guardada = db_session.get(ActivityModel, actividad.id)
    assert guardada.status == "cancelled"
    assert guardada.motivo_cancelacion == MOTIVO
    filas = {
        p.user_id: (p.status, p.estado_anterior)
        for p in db_session.exec(select(ParticipationModel)).all()
    }
    assert filas == {
        "luis": ("cancelada", "aceptada"),
        "maria": ("cancelada", "pendiente"),
        "sofia": ("cancelada", "en_espera"),
        "carlos": ("rechazada", None),
    }

    # La organizadora ve a quién afectó y en qué estado estaba cada uno
    detalle = GetActivityDetailQueryHandler(repo_act, repo_part).execute(
        GetActivityDetailQuery(activity_id=actividad.id, current_user_id=ORGANIZADOR_ID)
    )
    assert detalle.status == "cancelled"
    assert detalle.motivo_cancelacion == MOTIVO
    assert {(p.name, p.estado_anterior) for p in detalle.postulantes_cancelados} == {
        ("Luis Mamani", "aceptada"),
        ("María López", "pendiente"),
        ("Sofía Vargas", "en_espera"),
    }

    # Cada voluntario ve el motivo en Mi trayectoria
    trayectoria = ListUserParticipationsQueryHandler(repo_part, repo_act).execute(
        ListUserParticipationsQuery(user_id="maria")
    )
    assert [(i.estado_solicitud, i.estado_anterior, i.motivo_cancelacion) for i in trayectoria.items] == [
        ("cancelada", "pendiente", MOTIVO)
    ]
