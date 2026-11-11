from sqlmodel import Session

from app.entities.user import User


class UserRepository:
    """Solo lectura: la tabla `user` la maneja Better Auth en el frontend."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, user_id: str) -> User | None:
        return self.session.get(User, user_id)
