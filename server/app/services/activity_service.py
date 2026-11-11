"""
Actividades: crear, editar, publicar, cerrar, reabrir, cancelar y eliminar.

    draft ──publicar──▶ active ──cerrar──▶ closed ──reabrir──▶ active
                          │                  │
                          └────cancelar──────┴──▶ cancelled (con motivo)
"""

from datetime import datetime
from uuid import UUID

from sqlmodel import Session

from app.core.fechas import already_passed, utc_now
from app.core.geocoding import reverse_geocode
from app.core.storage import delete_activity_image, save_activity_image
from app.dtos.activity_dto import (
    ActivityDetailRead,
    ActivityListRead,
    CancelarActividadRequest,
    CreateActivityRequest,
    MyActivityListRead,
    SearchFilters,
    UpdateActivityCapacityRequest,
    UpdateActivityInfoRequest,
    UpdateDescriptionRequest,
    UpdateLocationRequest,
    to_activity_detail,
    to_activity_list,
    to_my_activities,
)
from app.dtos.cause_dto import ReplaceActivityCausesRequest
from app.entities.activity import Activity, ActivityStatus
from app.entities.activity_detail import (
    MAX_ADDRESS,
    MAX_DESCRIPTION,
    MAX_PLACE,
    ActivityDetail,
)
from app.entities.cause import Cause
from app.entities.participation import EstadoParticipacion
from app.exceptions import (
    ActividadCanceladaException,
    ActivityNotFoundException,
    CapacityLessThanRegisteredException,
    InvalidActivityCapacityException,
    InvalidActivityDateException,
    InvalidActivityDetailException,
    InvalidActivityImageException,
    InvalidActivityNameException,
    MotivoCancelacionObligatorioException,
    ValidationException,
)
from app.repositories.activity_detail_repository import ActivityDetailRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.cause_repository import CauseRepository
from app.repositories.participation_repository import ParticipationRepository
from app.services.activity_guards import ensure_not_cancelled, ensure_owner, get_activity_or_404
from app.services.participation_service import ParticipationService

MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
MAX_MOTIVO_CANCELACION = 500
MAX_CAPACITY = 10000


class ActivityService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.activities = ActivityRepository(session)
        self.details = ActivityDetailRepository(session)
        self.causes = CauseRepository(session)
        self.participations = ParticipationRepository(session)
        self.solicitudes = ParticipationService(session)

    # ══════════════════════════════════════════════════════════════════════════
    # Crear
    # ══════════════════════════════════════════════════════════════════════════
    def crear(
        self, owner_id: str, datos: CreateActivityRequest, imagen: bytes, nombre_archivo: str | None
    ) -> Activity:
        """Nueva actividad en borrador. La fecha tiene que ser futura."""
        image_url = self._guardar_portada(imagen, nombre_archivo)
        try:
            ensure_future_date(validate_date(datos.date))
            activity = Activity(
                name=normalize_name(datos.name),
                owner_id=validate_owner_id(owner_id),
                image_url=validate_image_url(image_url),
                date=datos.date,
                capacity=validate_capacity(datos.capacity),
                status=ActivityStatus.DRAFT.value,
            )
            self.activities.save(activity)
            self.session.commit()
        except Exception:
            # Si la actividad no se guardó, la imagen subida ya no sirve
            delete_activity_image(image_url)
            raise
        return activity

    # ══════════════════════════════════════════════════════════════════════════
    # Consultas
    # ══════════════════════════════════════════════════════════════════════════
    def listar_explorar(self, user_id: str) -> ActivityListRead:
        activities = self.activities.find_explore(exclude_owner_id=user_id, min_date=utc_now())
        return self._a_lista(activities)

    def listar_mias(self, user_id: str) -> MyActivityListRead:
        activities = self.activities.find_by_owner(user_id)
        ids = [activity.id for activity in activities]
        return to_my_activities(
            activities,
            self.causes.find_by_activities(ids),
            self.participations.count_accepted_by_activity(ids),
        )

    def buscar(self, filtros: SearchFilters) -> ActivityListRead:
        return self._a_lista(self.activities.search(filtros, min_date=utc_now()))

    def obtener_detalle(self, activity_id: UUID, user_id: str) -> ActivityDetailRead:
        activity = get_activity_or_404(self.activities, activity_id)
        is_owner = activity.is_owner(user_id)
        # Un borrador solo lo ve quien lo creó
        if activity.is_draft and not is_owner:
            raise ActivityNotFoundException()

        mi_solicitud = self.participations.find_of_user(activity_id, user_id) if user_id else None
        estado_solicitud = mi_solicitud.status if mi_solicitud else None
        en_espera_yo = estado_solicitud == EstadoParticipacion.EN_ESPERA

        # Solo el organizador ve las solicitudes pendientes, la lista de espera y los cancelados
        en_espera = (
            self.participations.find_waiting(activity_id) if is_owner or en_espera_yo else []
        )
        # El voluntario solo ve su puesto, no los nombres de los demás
        posicion_en_espera = next(
            (puesto for puesto, p in enumerate(en_espera, start=1) if p.user_id == user_id),
            None,
        )

        return to_activity_detail(
            activity,
            detail=self.details.find_by_activity(activity_id),
            causes=self.causes.find_by_activity(activity_id),
            is_owner=is_owner,
            estado_solicitud=estado_solicitud,
            is_participating=estado_solicitud == EstadoParticipacion.ACEPTADA,
            participants=self.participations.find_by_status(activity_id, EstadoParticipacion.ACEPTADA),
            solicitudes_pendientes=(
                self.participations.find_by_status(activity_id, EstadoParticipacion.PENDIENTE)
                if is_owner
                else []
            ),
            posicion_en_espera=posicion_en_espera,
            lista_de_espera=en_espera if is_owner else [],
            postulantes_cancelados=(
                self.participations.find_by_status(activity_id, EstadoParticipacion.CANCELADA)
                if is_owner and activity.is_cancelled
                else []
            ),
        )

    # ══════════════════════════════════════════════════════════════════════════
    # Editar (solo el organizador)
    # ══════════════════════════════════════════════════════════════════════════
    async def actualizar_ubicacion(
        self, activity_id: UUID, user_id: str, datos: UpdateLocationRequest
    ) -> None:
        self._actividad_propia(activity_id, user_id, "Solo el organizador puede editar la ubicación.")
        _, address = await reverse_geocode(datos.latitude, datos.longitude)
        place = (datos.place or "").strip() or "Ubicación por definir"
        latitude, longitude = validate_coordinates(datos.latitude, datos.longitude)

        detail = self.details.find_by_activity(activity_id)
        if detail is None:
            self.details.save(
                ActivityDetail(
                    activity_id=activity_id,
                    latitude=latitude,
                    longitude=longitude,
                    place=validate_place(place),
                    address=validate_address(address),
                )
            )
        else:
            detail.latitude, detail.longitude = latitude, longitude
            detail.place = validate_place(place)
            if address is not None:
                detail.address = validate_address(address)
        self.session.commit()

    def actualizar_descripcion(
        self, activity_id: UUID, user_id: str, datos: UpdateDescriptionRequest
    ) -> None:
        self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede editar la descripción."
        )
        description = validate_description(datos.description)
        detail = self.details.find_by_activity(activity_id)
        if detail is None:
            self.details.save(ActivityDetail(activity_id=activity_id, description=description))
        else:
            detail.description = description
        self.session.commit()

    def actualizar_portada(
        self, activity_id: UUID, user_id: str, imagen: bytes, nombre_archivo: str | None
    ) -> None:
        image_url = self._guardar_portada(imagen, nombre_archivo)
        try:
            activity = self._actividad_propia(
                activity_id, user_id, "Solo el organizador puede editar la imagen."
            )
            anterior = activity.image_url
            activity.image_url = validate_image_url(image_url)
            self.session.commit()
        except Exception:
            delete_activity_image(image_url)
            raise
        # La imagen anterior ya no la usa nadie
        delete_activity_image(anterior)

    def actualizar_datos(
        self, activity_id: UUID, user_id: str, datos: UpdateActivityInfoRequest
    ) -> None:
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede editar los datos de la actividad."
        )
        if datos.name is not None:
            activity.name = normalize_name(datos.name)
        if datos.date is not None:
            ensure_future_date(validate_date(datos.date))
            activity.date = datos.date
        self.session.commit()

    def actualizar_cupos(
        self, activity_id: UUID, user_id: str, datos: UpdateActivityCapacityRequest
    ) -> None:
        activity = self._actividad_propia(
            activity_id,
            user_id,
            "Solo el organizador puede editar los cupos de la actividad.",
            for_update=True,
        )
        inscritos = self.participations.count_accepted(activity_id)
        if datos.capacity < inscritos:
            raise CapacityLessThanRegisteredException(inscritos)
        activity.capacity = validate_capacity(datos.capacity)
        # Si hay cupos nuevos, entran los primeros de la lista de espera
        self.solicitudes.llenar_cupos_desde_lista_de_espera(activity)
        self.session.commit()

    def reemplazar_causas(
        self, activity_id: UUID, user_id: str, datos: ReplaceActivityCausesRequest
    ) -> None:
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede modificar las causas.", for_update=True
        )
        if activity.is_active and not datos.cause_ids:
            raise ValidationException(
                "Una actividad publicada debe mantener al menos una causa asignada."
            )
        cause_ids = list(dict.fromkeys(datos.cause_ids))
        if len(self.causes.find_by_ids(cause_ids)) != len(cause_ids):
            raise ValidationException("Una o más causas seleccionadas no existen en el catálogo.")
        self.causes.replace_links_of_activity(activity.id, cause_ids)
        self.session.commit()

    # ══════════════════════════════════════════════════════════════════════════
    # Estado de la convocatoria
    # ══════════════════════════════════════════════════════════════════════════
    def publicar(self, activity_id: UUID, user_id: str) -> None:
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede publicar la actividad."
        )
        ensure_not_cancelled(activity)
        missing = missing_requirements(
            activity,
            self.details.find_by_activity(activity_id),
            self.causes.find_by_activity(activity_id),
        )
        if missing:
            raise ValidationException(
                "No se puede publicar la actividad. Faltan completar los siguientes "
                f"requisitos: {', '.join(missing)}."
            )
        activity.status = ActivityStatus.ACTIVE.value
        self.session.commit()

    def cerrar(self, activity_id: UUID, user_id: str) -> None:
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede cerrar la convocatoria.", for_update=True
        )
        ensure_not_cancelled(activity)
        activity.status = ActivityStatus.CLOSED.value
        self.session.commit()

    def reabrir(self, activity_id: UUID, user_id: str) -> None:
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede reabrir la convocatoria."
        )
        if not activity.is_closed:
            raise ValidationException("Solo se pueden reabrir actividades cerradas.")
        if activity.has_passed():
            raise ValidationException(
                "No se puede reabrir una actividad cuya fecha ya ha transcurrido."
            )
        activity.status = ActivityStatus.ACTIVE.value
        self.session.commit()

    def cancelar(self, activity_id: UUID, user_id: str, datos: CancelarActividadRequest) -> None:
        """La organización cancela una oportunidad publicada. El motivo es obligatorio."""
        # FOR UPDATE: nadie acepta ni se une mientras se cancela
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede cancelar la actividad.", for_update=True
        )
        ensure_not_cancelled(activity)
        if activity.is_draft:
            raise ValidationException(
                "Un borrador no se cancela porque nadie lo ve; puedes eliminarlo."
            )
        if activity.has_passed():
            raise ValidationException("No se puede cancelar una actividad que ya pasó.")

        motivo = (datos.motivo or "").strip()
        if not motivo:
            raise MotivoCancelacionObligatorioException()
        if len(motivo) > MAX_MOTIVO_CANCELACION:
            raise ValidationException(
                f"El motivo no puede superar los {MAX_MOTIVO_CANCELACION} caracteres."
            )

        activity.status = ActivityStatus.CANCELLED.value
        activity.motivo_cancelacion = motivo
        # Pendientes, aceptadas y en espera pasan a canceladas y guardan su estado anterior
        self.solicitudes.cancelar_solicitudes_de(activity)
        self.session.commit()

    def eliminar(self, activity_id: UUID, user_id: str) -> None:
        activity = self._actividad_propia(
            activity_id, user_id, "Solo el organizador puede eliminar la actividad.", for_update=True
        )
        # Se conserva para que cada voluntario vea el motivo en su historial
        if activity.is_cancelled:
            raise ActividadCanceladaException(
                "Una actividad cancelada no se elimina: los voluntarios ven el motivo en su historial."
            )
        if self.participations.count_accepted(activity_id) > 0:
            raise ValidationException(
                "No se puede eliminar una actividad que ya cuenta con participantes inscritos."
            )

        image_url = activity.image_url
        self.participations.delete_unconfirmed(activity_id)
        self.causes.delete_links_of_activity(activity_id)
        detail = self.details.find_by_activity(activity_id)
        if detail is not None:
            self.details.delete(detail)
        self.session.flush()
        self.activities.delete(activity)
        self.session.commit()

        delete_activity_image(image_url)

    # ── Privados ──────────────────────────────────────────────────────────────
    def _actividad_propia(
        self, activity_id: UUID, user_id: str, message: str, *, for_update: bool = False
    ) -> Activity:
        """La actividad, solo si quien pide es su organizador."""
        activity = get_activity_or_404(self.activities, activity_id, for_update=for_update)
        ensure_owner(activity, user_id, message)
        return activity

    def _a_lista(self, activities: list[Activity]) -> ActivityListRead:
        ids = [activity.id for activity in activities]
        return to_activity_list(
            activities,
            self.causes.find_by_activities(ids),
            self.participations.count_accepted_by_activity(ids),
        )

    @staticmethod
    def _guardar_portada(imagen: bytes, nombre_archivo: str | None) -> str:
        """Valida la imagen subida, la guarda y devuelve su URL pública."""
        if not imagen:
            raise InvalidActivityImageException("El archivo de imagen no puede estar vacío.")
        if len(imagen) > MAX_IMAGE_SIZE_BYTES:
            raise InvalidActivityImageException("La imagen no debe superar los 2MB.")
        try:
            return save_activity_image(imagen, filename=nombre_archivo)
        except ValueError as exc:
            raise InvalidActivityImageException(str(exc))
        except OSError:
            raise InvalidActivityImageException("No se pudo guardar la imagen en el servidor.")


# ══════════════════════════════════════════════════════════════════════════════
# Validaciones de los datos de una actividad
# ══════════════════════════════════════════════════════════════════════════════
def missing_requirements(
    activity: Activity,
    detail: ActivityDetail | None,
    causes: list[Cause],
    now: datetime | None = None,
) -> list[str]:
    """Lo que le falta a la actividad para poder publicarse."""
    missing: list[str] = []
    if not activity.name or not activity.name.strip():
        missing.append("título")
    if activity.has_passed(now):
        missing.append("fecha futura válida")
    if not activity.image_url or not activity.image_url.strip():
        missing.append("foto de portada")
    if not activity.capacity or activity.capacity <= 0:
        missing.append("cupos disponibles")
    if detail is None or not detail.has_location:
        missing.append("ubicación en el mapa")
    if detail is None or not detail.description or not detail.description.strip():
        missing.append("descripción")
    if not causes:
        missing.append("al menos una causa temática")
    return missing


def normalize_name(name: str) -> str:
    if not isinstance(name, str) or not name.strip():
        raise InvalidActivityNameException("El nombre de la actividad no puede estar vacío.")
    return name.strip()


def validate_owner_id(owner_id: str) -> str:
    if not isinstance(owner_id, str) or not owner_id.strip():
        raise ValueError("El identificador del creador (owner_id) es obligatorio.")
    return owner_id.strip()


def validate_image_url(image_url: str) -> str:
    if not isinstance(image_url, str) or not image_url.strip():
        raise InvalidActivityImageException("La URL de la imagen de la actividad es requerida.")
    return image_url.strip()


def validate_date(date: datetime) -> datetime:
    if not isinstance(date, datetime):
        raise InvalidActivityDateException(
            "La fecha de la actividad debe ser un objeto datetime válido."
        )
    return date


def ensure_future_date(date: datetime, now: datetime | None = None) -> None:
    """Al crear o reprogramar, la fecha no puede ser anterior a la actual."""
    if already_passed(date, now or utc_now()):
        raise InvalidActivityDateException(
            "La fecha de la actividad debe ser posterior a la fecha actual."
        )


def validate_capacity(capacity: int) -> int:
    if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity <= 0:
        raise InvalidActivityCapacityException(
            "La cantidad de plazas debe ser un número entero mayor a cero."
        )
    if capacity > MAX_CAPACITY:
        raise InvalidActivityCapacityException("La cantidad de plazas no puede superar 10,000.")
    return capacity


def validate_coordinates(
    latitude: float | None, longitude: float | None
) -> tuple[float | None, float | None]:
    if latitude is None and longitude is None:
        return None, None
    if latitude is None or longitude is None:
        raise InvalidActivityDetailException(
            "Tanto la latitud como la longitud deben proporcionarse conjuntamente."
        )
    if not (-90.0 <= latitude <= 90.0):
        raise InvalidActivityDetailException(
            "La latitud debe estar comprendida entre -90.0 y 90.0 grados."
        )
    if not (-180.0 <= longitude <= 180.0):
        raise InvalidActivityDetailException(
            "La longitud debe estar comprendida entre -180.0 y 180.0 grados."
        )
    return float(latitude), float(longitude)


def _clean(value: str | None, maximum: int, message: str) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if len(cleaned) > maximum:
        raise InvalidActivityDetailException(message)
    return cleaned or None


def validate_place(place: str | None) -> str | None:
    return _clean(place, MAX_PLACE, "El nombre del lugar no puede superar los 255 caracteres.")


def validate_address(address: str | None) -> str | None:
    return _clean(address, MAX_ADDRESS, "La dirección no puede superar los 500 caracteres.")


def validate_description(description: str | None) -> str | None:
    return _clean(
        description, MAX_DESCRIPTION, "La descripción no puede superar los 5,000 caracteres."
    )
