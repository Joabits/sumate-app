"""Analítica: los eventos de cada flujo se guardan sin datos de la persona y se cuentan en embudos."""

from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError
from sqlmodel import select

from app.services.analitica_service import AnaliticaService
from app.controllers import analitica_controller as ctrl
from app.entities.evento import Evento
from app.exceptions import EventoInvalidoException
from app.dtos.analitica_dto import EventoRequest
from tests.helpers import usuario

LUIS = usuario("luis")


def registrar(session, evento: str, **props):
    return ctrl.registrar_evento(EventoRequest(evento=evento, props=props), LUIS, AnaliticaService(session))


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
            EventoRequest(evento="postulacion_enviada", props=props), LUIS, AnaliticaService(db_session)
        )
    assert guardados(db_session) == []


@pytest.mark.parametrize(
    ("evento", "props"),
    [
        ("retiro_iniciado", {"estado": "aceptada"}),
        ("retiro_confirmado", {"estado": "pendiente", "entro_de_lista_de_espera": False}),
        ("solicitud_aceptada", {}),
        ("actividad_creacion_iniciada", {}),
        ("actividad_creada", {}),
        ("actividad_publicada", {}),
        ("horas_registradas", {"participantes": 3}),
        ("horas_respondidas", {"respuesta": "reclamadas"}),
        ("busqueda_realizada", {"con_texto": True, "con_filtros": False, "con_resultados": False}),
        ("accion_rechazada", {"flujo": "retiro", "motivo": "fuera_de_plazo"}),
    ],
)
def test_cada_evento_del_plan_se_guarda_con_sus_propiedades(db_session, evento, props):
    registrar(db_session, evento, **props)
    (guardado,) = guardados(db_session)
    assert (guardado.evento, guardado.props) == (evento, props)


@pytest.mark.parametrize(
    ("evento", "props"),
    [
        # Valor fuera de la lista fija
        ("retiro_iniciado", {"estado": "rechazada"}),
        ("accion_rechazada", {"flujo": "retiro", "motivo": "Me enfermé y no puedo ir"}),
        ("horas_respondidas", {"respuesta": "si"}),
        # El texto que escribe la persona no se guarda
        ("retiro_confirmado", {"estado": "aceptada", "entro_de_lista_de_espera": True, "motivo": "viaje"}),
        ("busqueda_realizada", {"con_texto": "reciclaje", "con_filtros": False, "con_resultados": True}),
        # Números: solo enteros en rango, nunca un booleano
        ("horas_registradas", {"participantes": True}),
        ("horas_registradas", {"participantes": 0}),
        ("horas_registradas", {"participantes": 2.5}),
        # Un evento sin propiedades no acepta ninguna
        ("actividad_creada", {"nombre": "Taller de primeros auxilios"}),
    ],
)
def test_rechaza_valores_fuera_de_la_lista_y_texto_libre(db_session, evento, props):
    with pytest.raises(EventoInvalidoException):
        registrar(db_session, evento, **props)
    assert guardados(db_session) == []


def embudo(resumen, clave):
    return next(e for e in resumen.embudos if e.clave == clave)


def cantidades(resumen, clave):
    return [p.cantidad for p in embudo(resumen, clave).pasos]


def test_el_panel_cuenta_un_embudo_por_flujo(db_session):
    # Postular: 3 abren la confirmación, 2 envían y el organizador acepta 1
    for espera in (False, False, True):
        registrar(db_session, "postulacion_iniciada", lista_de_espera=espera)
    for espera in (False, True):
        registrar(db_session, "postulacion_enviada", lista_de_espera=espera)
    registrar(db_session, "solicitud_aceptada")
    # Retiro: 3 abren, 2 se retiran y en 1 entra alguien de la lista de espera
    for estado in ("aceptada", "aceptada", "pendiente"):
        registrar(db_session, "retiro_iniciado", estado=estado)
    registrar(db_session, "retiro_confirmado", estado="aceptada", entro_de_lista_de_espera=True)
    registrar(db_session, "retiro_confirmado", estado="pendiente", entro_de_lista_de_espera=False)
    registrar(db_session, "accion_rechazada", flujo="retiro", motivo="fuera_de_plazo")
    # Horas: dos jornadas de 3 y 2 participantes; 4 responden y 3 aceptan
    registrar(db_session, "horas_registradas", participantes=3)
    registrar(db_session, "horas_registradas", participantes=2)
    for respuesta in ("aceptadas", "aceptadas", "aceptadas", "reclamadas"):
        registrar(db_session, "horas_respondidas", respuesta=respuesta)
    # Búsqueda: 4 búsquedas, 1 sin resultados
    for con_resultados in (True, True, True, False):
        registrar(
            db_session,
            "busqueda_realizada",
            con_texto=True,
            con_filtros=False,
            con_resultados=con_resultados,
        )

    resumen = ctrl.analitica(LUIS, AnaliticaService(db_session))

    assert cantidades(resumen, "postulacion") == [3, 2, 1]
    assert cantidades(resumen, "retiro") == [3, 2, 1]
    assert embudo(resumen, "retiro").rechazos == 1
    assert cantidades(resumen, "crear_actividad") == [0, 0, 0]
    assert cantidades(resumen, "horas") == [5, 4, 3]
    assert cantidades(resumen, "busqueda") == [4, 3]
    assert [(r.flujo, r.motivo, r.cantidad) for r in resumen.rechazos] == [
        ("retiro", "fuera_de_plazo", 1)
    ]


def test_sin_eventos_el_panel_queda_en_cero(db_session):
    resumen = ctrl.analitica(LUIS, AnaliticaService(db_session))
    assert [e.clave for e in resumen.embudos] == [
        "postulacion",
        "retiro",
        "crear_actividad",
        "horas",
        "busqueda",
    ]
    assert all(p.cantidad == 0 for e in resumen.embudos for p in e.pasos)
    assert resumen.rechazos == []
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

    ultimos = ctrl.analitica(LUIS, AnaliticaService(db_session)).ultimos
    assert len(ultimos) == 10
    assert ultimos[0].fecha.replace(tzinfo=None) == datetime(2026, 11, 10, 16, 11)
    assert ultimos[-1].fecha.replace(tzinfo=None) == datetime(2026, 11, 10, 16, 2)
