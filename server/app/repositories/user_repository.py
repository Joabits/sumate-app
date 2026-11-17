from sqlmodel import Session

from app.entities.user import User


class UserRepository:
    """
    La tabla `user` la maneja Better Auth en el frontend. El backend la lee y,
    al eliminar la cuenta, borra la fila: en PostgreSQL las tablas `session` y
    `account` de Better Auth caen con ella (ON DELETE CASCADE), así esa cuenta
    ya no puede iniciar sesión.
    """

    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, user_id: str) -> User | None:
        return self.session.get(User, user_id)

    def delete(self, user: User) -> None:
        self.session.delete(user)
