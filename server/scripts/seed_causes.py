import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session

from app.core.database import engine
from app.services.cause_service import CauseService

PREDEFINED_CAUSES = [
    {"name": "Salud", "slug": "salud"},
    {"name": "Animales", "slug": "animales"},
    {"name": "Medio Ambiente", "slug": "medio-ambiente"},
    {"name": "Educación", "slug": "educacion"},
    {"name": "Comunidad", "slug": "comunidad"},
    {"name": "Deporte", "slug": "deporte"},
    {"name": "Cultura y Arte", "slug": "cultura-y-arte"},
    {"name": "Niñez y Juventud", "slug": "ninez-y-juventud"},
    {"name": "Adulto Mayor", "slug": "adulto-mayor"},
    {"name": "Tecnología Social", "slug": "tecnologia-social"},
]


def seed_causes() -> None:
    with Session(engine) as session:
        service = CauseService(session)
        created_count = sum(
            service.crear_si_no_existe(item["name"], item["slug"]) is not None
            for item in PREDEFINED_CAUSES
        )
        print(f"Seeding completed. Inserted {created_count} causes.")


if __name__ == "__main__":
    seed_causes()
