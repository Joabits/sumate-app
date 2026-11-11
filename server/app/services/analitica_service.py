"""
Analítica de interacción.

Cada vez que alguien empieza o termina un flujo principal se guarda un evento.
Después se cuentan y sale el número que responde la pregunta:

    ¿Cuántos de los que empiezan a postular a una actividad envían la solicitud?

Se registra la acción, no a la persona. Cada evento tiene una lista fija de
propiedades y se rechaza cualquier otra.
"""

from typing import Any

from sqlmodel import Session

from app.dtos.analitica_dto import AnaliticaRead, to_analitica
from app.entities.evento import Evento, NombreEvento
from app.exceptions import EventoInvalidoException
from app.repositories.evento_repository import EventoRepository

# Propiedades de cada evento y su tipo. Solo lo que la pregunta necesita.
PROPIEDADES: dict[NombreEvento, dict[str, type]] = {
    NombreEvento.POSTULACION_INICIADA: {"lista_de_espera": bool},
    NombreEvento.POSTULACION_ENVIADA: {"lista_de_espera": bool},
}


class AnaliticaService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.eventos = EventoRepository(session)

    def registrar(self, evento: NombreEvento, props: dict[str, Any]) -> Evento:
        nuevo = self.eventos.save(Evento(evento=evento.value, props=validar_props(evento, props)))
        self.session.commit()
        return nuevo

    def resumen(self) -> AnaliticaRead:
        return to_analitica(self.eventos.count_postulaciones(), self.eventos.find_latest())


def validar_props(evento: NombreEvento, props: dict[str, Any]) -> dict[str, Any]:
    """Deja pasar solo las propiedades definidas para el evento, con su tipo."""
    permitidas = PROPIEDADES[evento]
    if set(props) != set(permitidas):
        raise EventoInvalidoException(
            f"{evento.value} lleva solo estas propiedades: {', '.join(permitidas)}."
        )
    for nombre, tipo in permitidas.items():
        # type() y no isinstance(): True no debe pasar por un número ni al revés
        if type(props[nombre]) is not tipo:
            raise EventoInvalidoException(f"La propiedad {nombre} no tiene el tipo esperado.")
    return {nombre: props[nombre] for nombre in permitidas}
