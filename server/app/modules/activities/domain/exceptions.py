from app.shared.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)


class ActivityNotFoundException(NotFoundException):
    """La actividad solicitada no existe o fue dada de baja."""
    code = "ACTIVITY_NOT_FOUND"
    message = "La actividad no fue encontrada."


class InvalidActivityNameException(ValidationException):
    """El nombre de la actividad no cumple con los requisitos del dominio."""
    code = "INVALID_ACTIVITY_NAME"
    message = "El nombre de la actividad no puede estar vacío."


class InvalidActivityDateException(ValidationException):
    """La fecha de la actividad debe ser una fecha válida."""
    code = "INVALID_ACTIVITY_DATE"
    message = "La fecha de la actividad es inválida."


class InvalidActivityImageException(ValidationException):
    """La URL de la imagen de la actividad es requerida y debe ser válida."""
    code = "INVALID_ACTIVITY_IMAGE"
    message = "La imagen de la actividad es obligatoria."


class InvalidActivityCapacityException(ValidationException, ValueError):
    """La cantidad de cupos o plazas no cumple con las reglas del dominio."""
    code = "INVALID_CAPACITY"
    message = "La cantidad de plazas debe ser mayor a cero y no superar 10,000."


class CapacityLessThanRegisteredException(ValidationException):
    code = "CAPACITY_LESS_THAN_REGISTERED"

    def __init__(self, registered_count: int) -> None:
        super().__init__(
            message=f"No es posible reducir los cupos a un número menor a los participantes ya inscritos ({registered_count}).",
            code="CAPACITY_LESS_THAN_REGISTERED",
        )



class ActividadCanceladaException(ConflictException):
    """La organización canceló la actividad: ya no admite cambios ni solicitudes."""
    code = "ACTIVIDAD_CANCELADA"
    message = "La actividad fue cancelada por la organización."


class MotivoCancelacionObligatorioException(ValidationException):
    code = "MOTIVO_CANCELACION_OBLIGATORIO"
    message = "Escribe el motivo de la cancelación."
