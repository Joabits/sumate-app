from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """
    Tabla `user` de Better Auth.

    La crea y la gestiona el frontend (Next.js). Aquí solo se lee, para mostrar
    el nombre y la foto del organizador y de los voluntarios.
    Alembic la ignora (ver BETTER_AUTH_TABLES en alembic/env.py).

    Solo se mapean las columnas que siempre existen y que el backend usa:
    las de los plugins (role, banned...) no están en todas las instalaciones y
    pedirlas rompería la consulta.
    """

    __tablename__ = "user"  # type: ignore[assignment]

    id: str = Field(primary_key=True)
    name: str
    email: str
    image: str | None = None
