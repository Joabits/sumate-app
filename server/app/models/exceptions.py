"""
Errores de negocio de los modelos.

Cada error lleva un código estable que el frontend usa para reconocerlo.
El manejador de errores (app/core/errors.py) traduce cada familia a su estado HTTP:

    NotFoundException    → 404
    ForbiddenException   → 403
    ConflictException    → 409
    ValidationException  → 400
"""


class AppException(Exception):
    """Base de todos los errores de negocio."""

    code: str = "INTERNAL_DOMAIN_ERROR"
    message: str = "Ocurrió un error inesperado en el dominio."

    def __init__(self, message: str | None = None, code: str | None = None):
        if message:
            self.message = message
        if code:
            self.code = code
        super().__init__(self.message)

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"


class NotFoundException(AppException):
    code = "NOT_FOUND"


class ValidationException(AppException):
    code = "VALIDATION_ERROR"


class ConflictException(AppException):
    code = "CONFLICT_ERROR"


class ForbiddenException(AppException):
    code = "FORBIDDEN"


# ── Actividades ───────────────────────────────────────────────────────────────
class ActivityNotFoundException(NotFoundException):
    code = "ACTIVITY_NOT_FOUND"
    message = "La actividad no fue encontrada."


class InvalidActivityNameException(ValidationException):
    code = "INVALID_ACTIVITY_NAME"
    message = "El nombre de la actividad no puede estar vacío."


class InvalidActivityDateException(ValidationException):
    code = "INVALID_ACTIVITY_DATE"
    message = "La fecha de la actividad es inválida."


class InvalidActivityImageException(ValidationException):
    code = "INVALID_ACTIVITY_IMAGE"
    message = "La imagen de la actividad es obligatoria."


class InvalidActivityCapacityException(ValidationException, ValueError):
    code = "INVALID_CAPACITY"
    message = "La cantidad de plazas debe ser mayor a cero y no superar 10,000."


class InvalidActivityDetailException(ValidationException, ValueError):
    """Ubicación, lugar, dirección o descripción fuera de los límites permitidos."""

    code = "INVALID_ACTIVITY_DETAIL"
    message = "Los datos del detalle de la actividad son inválidos."


class CapacityLessThanRegisteredException(ValidationException):
    code = "CAPACITY_LESS_THAN_REGISTERED"

    def __init__(self, registered_count: int) -> None:
        super().__init__(
            message=(
                "No es posible reducir los cupos a un número menor a los participantes "
                f"ya inscritos ({registered_count})."
            ),
        )


class ActividadCanceladaException(ConflictException):
    """La organización canceló la actividad: ya no admite cambios ni solicitudes."""

    code = "ACTIVIDAD_CANCELADA"
    message = "La actividad fue cancelada por la organización."


class MotivoCancelacionObligatorioException(ValidationException):
    code = "MOTIVO_CANCELACION_OBLIGATORIO"
    message = "Escribe el motivo de la cancelación."


# ── Participaciones ───────────────────────────────────────────────────────────
class CannotJoinPastActivityException(ValidationException):
    code = "CANNOT_JOIN_PAST_ACTIVITY"
    message = "No es posible unirse a una actividad que ya ha concluido o cuya fecha ya transcurrió."


class CannotJoinOwnActivityException(ValidationException):
    code = "CANNOT_JOIN_OWN_ACTIVITY"
    message = "El organizador no puede inscribirse en su propia actividad."


class CannotJoinInactiveActivityException(ValidationException):
    code = "CANNOT_JOIN_INACTIVE_ACTIVITY"
    message = "No es posible unirse a una actividad que no se encuentra activa."


class ActivityCapacityExceededException(ConflictException):
    code = "ACTIVITY_CAPACITY_EXCEEDED"
    message = "La actividad ha alcanzado su capacidad máxima de participantes."


class AlreadyParticipatingException(ConflictException):
    code = "ALREADY_PARTICIPATING"
    message = "El usuario ya se encuentra registrado en esta actividad."


class ParticipationNotFoundException(NotFoundException):
    code = "PARTICIPATION_NOT_FOUND"
    message = "No se encontró el registro de participación para esta actividad."


class CannotLeavePastActivityException(ValidationException):
    code = "CANNOT_LEAVE_PAST_ACTIVITY"
    message = (
        "No es posible cancelar la participación de una actividad que ya ha concluido "
        "o cuya fecha ya transcurrió."
    )


class SolicitudRechazadaException(ConflictException):
    code = "SOLICITUD_RECHAZADA"
    message = "Tu solicitud para esta actividad fue rechazada por el organizador."


class SolicitudYaRevisadaException(ConflictException):
    code = "SOLICITUD_YA_REVISADA"
    message = "La solicitud ya fue revisada por el organizador."


class NoEsOrganizadorException(ForbiddenException):
    code = "NO_ES_ORGANIZADOR"
    message = "Solo el organizador de la actividad puede revisar las solicitudes."


class NoEstaEnListaDeEsperaException(ConflictException):
    code = "NO_ESTA_EN_LISTA_DE_ESPERA"
    message = "La solicitud no está en la lista de espera."


# ── Horas de voluntariado ─────────────────────────────────────────────────────
class ActividadNoTerminadaException(ValidationException):
    code = "ACTIVIDAD_NO_TERMINADA"
    message = "Las horas se registran cuando la actividad ya terminó."


class FechaJornadaInvalidaException(ValidationException):
    code = "FECHA_JORNADA_INVALIDA"
    message = "La jornada debe ser desde el día de la actividad y no puede ser una fecha futura."


class HorasInvalidasException(ValidationException):
    code = "HORAS_INVALIDAS"
    message = "Las horas deben ser mayores a 0 y no superar 24 por jornada."


class NoEsParticipanteAceptadoException(ValidationException):
    code = "NO_ES_PARTICIPANTE_ACEPTADO"
    message = "Solo se registran horas de participantes aceptados en la actividad."


class JornadaYaRegistradaException(ConflictException):
    code = "JORNADA_YA_REGISTRADA"
    message = "Ya hay horas registradas para ese participante en esa jornada."


class RegistroHorasNotFoundException(NotFoundException):
    code = "REGISTRO_HORAS_NOT_FOUND"
    message = "No se encontró el registro de horas."


class RegistroHorasNoPendienteException(ConflictException):
    code = "REGISTRO_HORAS_NO_PENDIENTE"
    message = "Solo se pueden aceptar o reclamar horas pendientes de respuesta."


class HorasYaConfirmadasException(ConflictException):
    code = "HORAS_YA_CONFIRMADAS"
    message = "Las horas confirmadas por el voluntario ya no se pueden corregir."


class MotivoReclamoObligatorioException(ValidationException):
    code = "MOTIVO_RECLAMO_OBLIGATORIO"
    message = "Escribe el motivo del reclamo."


# ── Analítica ─────────────────────────────────────────────────────────────────
class EventoInvalidoException(ValidationException):
    code = "EVENTO_INVALIDO"
    message = "El evento no tiene las propiedades definidas."
