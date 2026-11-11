"""Analítica: los eventos de la postulación se guardan sin datos de la persona y se cuentan."""

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError
from sqlmodel import select

from app.controllers import analitica_controller as ctrl
from app.models.evento import Evento
from app.models.exceptions import EventoInvalidoException
from app.views.analitica_view import EventoRequest
from tests.helpers import usuario

LUIS = usuario("luis")


def registrar(session, evento: str, **props):
    return ctrl.registrar_evento(EventoRequest(evento=evento, props=props), LUIS, session)


def guardados(session) -> list[Evento]:
    session.expire_all()
    return list(session.exec(select(Evento)).all())


def test_guarda_el_evento_una_vez_con_sus_propiedades_y_sin_datos_de_la_persona(db_session):
    respuesta = registrar(db_session, "postulacion_iniciada", lista_de_espera=False)

    assert respuesta.status_code == 201
    eventos = guardados(db_session)
    assert len(eventos) == 1
    assert eventos[0].evento == "postulacion_iniciada"
    assert eventos[0].props == {"lista_de_espera": False}
    assert eventos[0].fecha is not None
    # La tabla no tiene columnas de la persona y el registro no la menciona
    assert set(Evento.model_fields) == {"id", "evento", "props", "fecha"}
    assert "luis" not in eventos[0].model_dump_json()


def test_no_acepta_eventos_fuera_de_la_lista(db_session):
    with pytest.raises(ValidationError):
        EventoRequest(evento="boton_clic", props={})
    assert guardados(db_session) == []


@pytest.mark.parametrize(
    "props",
    [
        {},
        {"lista_de_espera": False, "correo": "luis@example.com"},
        {"lista_de_espera": False, "actividad": "Taller de primeros auxilios"},
        {"lista_de_espera": "no"},
        {"lista_de_espera": 0},
    ],
    ids=["falta", "correo", "actividad", "texto", "numero"],
)
def test_solo_acepta_las_propiedades_definidas(db_session, props):
    with pytest.raises(EventoInvalidoException):
        ctrl.registrar_evento(
            EventoRequest(evento="postulacion_enviada", props=props), LUIS, db_session
        )
    assert guardados(db_session) == []


def test_el_panel_cuenta_cuantos_empiezan_y_cuantos_terminan(db_session):
    # Con cupos: 3 abren la confirmación y 2 envían la solicitud
    for _ in range(3):
        registrar(db_session, "postulacion_iniciada", lista_de_espera=False)
    for _ in range(2):
        registrar(db_session, "postulacion_enviada", lista_de_espera=False)
    # Lista de espera: 2 abren la confirmación y 1 envía
    for _ in range(2):
        registrar(db_session, "postulacion_iniciada", lista_de_espera=True)
    registrar(db_session, "postulacion_enviada", lista_de_espera=True)

    postulacion = ctrl.analitica(LUIS, db_session).postulacion
    assert (postulacion.total.iniciadas, postulacion.total.enviadas) == (5, 3)
    assert (postulacion.con_cupos.iniciadas, postulacion.con_cupos.enviadas) == (3, 2)
    assert (postulacion.lista_de_espera.iniciadas, postulacion.lista_de_espera.enviadas) == (2, 1)


def test_sin_eventos_el_panel_queda_en_cero(db_session):
    resumen = ctrl.analitica(LUIS, db_session)
    assert (resumen.postulacion.total.iniciadas, resumen.postulacion.total.enviadas) == (0, 0)
    assert resumen.ultimos == []


def test_el_panel_muestra_los_ultimos_diez_eventos_del_mas_nuevo_al_mas_viejo(db_session):
    inicio = datetime(2026, 11, 10, 16, 0, tzinfo=timezone.utc)
    for minuto in range(12):
        db_session.add(
            Evento(
                evento="postulacion_iniciada",
                props={"lista_de_espera": False},
                fecha=inicio + timedelta(minutes=minuto),
            )
        )
    db_session.commit()

    ultimos = ctrl.analitica(LUIS, db_session).ultimos
    assert len(ultimos) == 10
    assert ultimos[0].fecha.replace(tzinfo=None) == datetime(2026, 11, 10, 16, 11)
    assert ultimos[-1].fecha.replace(tzinfo=None) == datetime(2026, 11, 10, 16, 2)
