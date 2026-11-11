from sqlalchemy import func, text
from sqlmodel import Session, select

from app.entities.evento import Evento, NombreEvento


class EventoRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, evento: Evento) -> Evento:
        self.session.add(evento)
        return evento

    def count_postulaciones(self) -> dict[tuple[str, bool], int]:
        """Cuántas postulaciones iniciadas y enviadas hay, con cupos y en lista de espera."""
        lista_de_espera = Evento.props["lista_de_espera"].as_boolean().label("lista_de_espera")
        filas = self.session.exec(
            select(Evento.evento, lista_de_espera, func.count())
            .where(
                Evento.evento.in_(
                    [NombreEvento.POSTULACION_INICIADA.value, NombreEvento.POSTULACION_ENVIADA.value]
                )
            )
            .group_by(Evento.evento, text("lista_de_espera"))
        ).all()
        return {(evento, bool(espera)): total for evento, espera, total in filas}

    def find_latest(self, limite: int = 10) -> list[Evento]:
        statement = select(Evento).order_by(Evento.fecha.desc()).limit(limite)
        return list(self.session.exec(statement).all())
