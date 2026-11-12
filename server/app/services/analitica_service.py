"""
Analítica de interacción.

Cada vez que alguien empieza, avanza o termina un flujo principal se guarda
un evento. Después se cuentan y salen los números que responden preguntas como:

    ¿Cuántos de los que empiezan a postular envían la solicitud?
    ¿En qué paso de crear una actividad se pierde más gente?
    ¿Cuántas búsquedas terminan sin resultados?

Se registra la acción, no a la persona. Cada evento tiene una lista fija de
propiedades y se rechaza cualquier otra. El plan completo (evento, flujo,
archivo:línea y pregunta) está en evidencias/tarea-9.md.
"""

from dataclasses import dataclass, field
from typing import Any

from sqlmodel import Session

from app.dtos.analitica_dto import (
    AnaliticaRead,
    EmbudoRead,
    PasoRead,
    RechazoRead,
    to_ultimos,
)
from app.entities.evento import Evento, NombreEvento as E
from app.exceptions import EventoInvalidoException
from app.repositories.evento_repository import EventoRepository

# ── Valores de las listas fijas ───────────────────────────────────────────────
ESTADOS_RETIRO = ("pendiente", "aceptada", "en_espera")
RESPUESTAS_HORAS = ("aceptadas", "reclamadas")
FLUJOS = ("postulacion", "retiro", "crear_actividad", "publicar_actividad", "horas")
MOTIVOS_RECHAZO = (
    "fuera_de_plazo",
    "sin_cupos",
    "sin_permiso",
    "validacion",
    "actividad_cancelada",
    "conflicto",
)

# Tipo de cada propiedad: bool, int o una tupla con los únicos textos posibles.
# Solo lo que la pregunta necesita: nunca usuario, nombres, ids ni texto escrito.
Tipo = type | tuple[str, ...]
PROPIEDADES: dict[E, dict[str, Tipo]] = {
    E.POSTULACION_INICIADA: {"lista_de_espera": bool},
    E.POSTULACION_ENVIADA: {"lista_de_espera": bool},
    E.SOLICITUD_ACEPTADA: {},
    E.RETIRO_INICIADO: {"estado": ESTADOS_RETIRO},
    E.RETIRO_CONFIRMADO: {"estado": ESTADOS_RETIRO, "entro_de_lista_de_espera": bool},
    E.ACTIVIDAD_CREACION_INICIADA: {},
    E.ACTIVIDAD_CREADA: {},
    E.ACTIVIDAD_PUBLICADA: {},
    E.HORAS_REGISTRADAS: {"participantes": int},
    E.HORAS_RESPONDIDAS: {"respuesta": RESPUESTAS_HORAS},
    E.BUSQUEDA_REALIZADA: {"con_texto": bool, "con_filtros": bool, "con_resultados": bool},
    E.ACCION_RECHAZADA: {"flujo": FLUJOS, "motivo": MOTIVOS_RECHAZO},
}


# ── Embudos del panel ─────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Paso:
    evento: E
    etiqueta: str
    # Solo cuenta los eventos con estas propiedades
    filtro: dict[str, Any] = field(default_factory=dict)
    # Suma esta propiedad en vez de contar eventos (ej. participantes de una jornada)
    suma: str | None = None


@dataclass(frozen=True)
class Embudo:
    clave: str
    titulo: str
    pregunta: str
    pasos: tuple[Paso, ...]
    # Flujo de accion_rechazada que corresponde a este embudo
    flujos: tuple[str, ...] = ()


EMBUDOS: tuple[Embudo, ...] = (
    Embudo(
        clave="postulacion",
        titulo="Postular a una actividad",
        pregunta="¿Cuántos de los que abren la confirmación envían la solicitud y cuántos son aceptados?",
        pasos=(
            Paso(E.POSTULACION_INICIADA, "Abrieron la confirmación"),
            Paso(E.POSTULACION_ENVIADA, "Enviaron la solicitud"),
            Paso(E.SOLICITUD_ACEPTADA, "El organizador los aceptó"),
        ),
        flujos=("postulacion",),
    ),
    Embudo(
        clave="retiro",
        titulo="Retirarse de una actividad",
        pregunta="¿Cuántos de los que abren el retiro lo terminan y cuántos chocan con el plazo de 24 horas?",
        pasos=(
            Paso(E.RETIRO_INICIADO, "Abrieron el retiro"),
            Paso(E.RETIRO_CONFIRMADO, "Se retiraron"),
            Paso(
                E.RETIRO_CONFIRMADO,
                "Su cupo pasó a alguien en espera",
                filtro={"entro_de_lista_de_espera": True},
            ),
        ),
        flujos=("retiro",),
    ),
    Embudo(
        clave="crear_actividad",
        titulo="Crear y publicar una actividad",
        pregunta="¿En qué paso se quedan las organizaciones: al llenar el formulario o al completar y publicar?",
        pasos=(
            Paso(E.ACTIVIDAD_CREACION_INICIADA, "Abrieron el formulario"),
            Paso(E.ACTIVIDAD_CREADA, "Guardaron el borrador"),
            Paso(E.ACTIVIDAD_PUBLICADA, "Publicaron"),
        ),
        flujos=("crear_actividad", "publicar_actividad"),
    ),
    Embudo(
        clave="horas",
        titulo="Horas de voluntariado",
        pregunta="¿Cuántas horas registradas acepta el voluntario y cuántas reclama?",
        pasos=(
            Paso(E.HORAS_REGISTRADAS, "Horas registradas (por participante)", suma="participantes"),
            Paso(E.HORAS_RESPONDIDAS, "El voluntario respondió"),
            Paso(E.HORAS_RESPONDIDAS, "Las aceptó", filtro={"respuesta": "aceptadas"}),
        ),
        flujos=("horas",),
    ),
    Embudo(
        clave="busqueda",
        titulo="Buscar actividades",
        pregunta="¿Cuántas búsquedas terminan sin resultados?",
        pasos=(
            Paso(E.BUSQUEDA_REALIZADA, "Buscaron"),
            Paso(E.BUSQUEDA_REALIZADA, "Encontraron resultados", filtro={"con_resultados": True}),
        ),
    ),
)


class AnaliticaService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.eventos = EventoRepository(session)

    def registrar(self, evento: E, props: dict[str, Any]) -> Evento:
        nuevo = self.eventos.save(Evento(evento=evento.value, props=validar_props(evento, props)))
        self.session.commit()
        return nuevo

    def resumen(self) -> AnaliticaRead:
        conteos = self.eventos.count_por_props()
        return AnaliticaRead(
            embudos=[_embudo(embudo, conteos) for embudo in EMBUDOS],
            rechazos=_rechazos(conteos),
            ultimos=to_ultimos(self.eventos.find_latest()),
        )


def validar_props(evento: E, props: dict[str, Any]) -> dict[str, Any]:
    """Deja pasar solo las propiedades definidas para el evento, con su tipo o valor de la lista fija."""
    permitidas = PROPIEDADES[evento]
    if set(props) != set(permitidas):
        nombres = ", ".join(permitidas) or "ninguna"
        raise EventoInvalidoException(f"{evento.value} lleva solo estas propiedades: {nombres}.")
    for nombre, tipo in permitidas.items():
        valor = props[nombre]
        if isinstance(tipo, tuple):
            if valor not in tipo:
                raise EventoInvalidoException(f"La propiedad {nombre} no es un valor de la lista fija.")
        # type() y no isinstance(): True no debe pasar por un número ni al revés
        elif type(valor) is not tipo:
            raise EventoInvalidoException(f"La propiedad {nombre} no tiene el tipo esperado.")
        elif tipo is int and not 0 < valor <= 1000:
            raise EventoInvalidoException(f"La propiedad {nombre} está fuera de rango.")
    return {nombre: props[nombre] for nombre in permitidas}


# ── Cuentas ───────────────────────────────────────────────────────────────────
Conteos = list[tuple[str, dict[str, Any], int]]


def _cantidad(paso: Paso, conteos: Conteos) -> int:
    total = 0
    for evento, props, cantidad in conteos:
        if evento != paso.evento.value:
            continue
        if any(props.get(clave) != valor for clave, valor in paso.filtro.items()):
            continue
        total += cantidad * int(props.get(paso.suma, 0)) if paso.suma else cantidad
    return total


def _embudo(embudo: Embudo, conteos: Conteos) -> EmbudoRead:
    rechazos = sum(
        cantidad
        for evento, props, cantidad in conteos
        if evento == E.ACCION_RECHAZADA.value and props.get("flujo") in embudo.flujos
    )
    return EmbudoRead(
        clave=embudo.clave,
        titulo=embudo.titulo,
        pregunta=embudo.pregunta,
        pasos=[
            PasoRead(evento=p.evento.value, etiqueta=p.etiqueta, cantidad=_cantidad(p, conteos))
            for p in embudo.pasos
        ],
        rechazos=rechazos,
    )


def _rechazos(conteos: Conteos) -> list[RechazoRead]:
    por_motivo: dict[tuple[str, str], int] = {}
    for evento, props, cantidad in conteos:
        if evento == E.ACCION_RECHAZADA.value:
            clave = (props["flujo"], props["motivo"])
            por_motivo[clave] = por_motivo.get(clave, 0) + cantidad
    filas = [RechazoRead(flujo=f, motivo=m, cantidad=c) for (f, m), c in por_motivo.items()]
    return sorted(filas, key=lambda r: (-r.cantidad, r.flujo, r.motivo))
