"""
Inyección de dependencias: FastAPI arma cada service con la sesión del request.

    def endpoint(service: ActivityServiceDep): ...
"""

from typing import Annotated

from fastapi import Depends

from app.core.database import DBSession
from app.services.activity_service import ActivityService
from app.services.analitica_service import AnaliticaService
from app.services.cause_service import CauseService
from app.services.horas_service import HorasService
from app.services.participation_service import ParticipationService


def get_activity_service(session: DBSession) -> ActivityService:
    return ActivityService(session)


def get_participation_service(session: DBSession) -> ParticipationService:
    return ParticipationService(session)


def get_horas_service(session: DBSession) -> HorasService:
    return HorasService(session)


def get_cause_service(session: DBSession) -> CauseService:
    return CauseService(session)


def get_analitica_service(session: DBSession) -> AnaliticaService:
    return AnaliticaService(session)


ActivityServiceDep = Annotated[ActivityService, Depends(get_activity_service)]
ParticipationServiceDep = Annotated[ParticipationService, Depends(get_participation_service)]
HorasServiceDep = Annotated[HorasService, Depends(get_horas_service)]
CauseServiceDep = Annotated[CauseService, Depends(get_cause_service)]
AnaliticaServiceDep = Annotated[AnaliticaService, Depends(get_analitica_service)]
