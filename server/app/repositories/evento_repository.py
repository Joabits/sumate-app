import json
from typing import Any

from sqlalchemy import String, cast, func
from sqlmodel import Session, select

from app.entities.evento import Evento


class EventoRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def save(self, evento: Evento) -> Evento:
        self.session.add(evento)
        return evento

    def count_por_props(self) -> list[tuple[str, dict[str, Any], int]]:
        """
        Cuántos eventos hay de cada nombre y combinación de propiedades.

        Las propiedades son pocas y de listas fijas, así que hay pocas filas.
        Se agrupa por el JSON como texto (PostgreSQL no compara columnas json).
        """
        props_texto = cast(Evento.props, String)
        filas = self.session.exec(
            select(Evento.evento, props_texto, func.count()).group_by(Evento.evento, props_texto)
        ).all()
        return [(evento, json.loads(props or "{}"), int(total)) for evento, props, total in filas]

    def find_latest(self, limite: int = 10) -> list[Evento]:
        statement = select(Evento).order_by(Evento.fecha.desc()).limit(limite)
        return list(self.session.exec(statement).all())
