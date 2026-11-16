from pydantic import ConfigDict
from pydantic.alias_generators import to_camel
from sqlmodel import SQLModel


class ReadModel(SQLModel):
    """Base de las respuestas: el JSON sale en camelCase (image_url → imageUrl).

    Así el frontend recibe los nombres que usa TypeScript y no necesita mappers.
    En Python los campos se siguen escribiendo en snake_case.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
