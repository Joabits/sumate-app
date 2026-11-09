/**
 * Constructores de ApiError
 *
 * Este módulo construye objetos ApiError a partir de distintas fuentes
 * (errores de Zod, respuestas HTTP del servidor) usando el adaptador
 * de backend activo.
 *
 * La lógica específica de cada framework backend vive en:
 *   errors/adapters/fastapi.error-adapter.ts
 *   errors/adapters/laravel.error-adapter.ts
 */
import { type ZodError } from "zod";
import { ApiError } from "@/api/apiResults";
import { activeBackendAdapter } from "./adapters";

// ─── Helpers internos ────────────────────────────────────────────────────────

async function parseResponseBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function flattenValidationErrors(
  validationErrors: Record<string, string[]>,
): string[] {
  return Object.values(validationErrors).flat();
}

// ─── Constructores públicos ───────────────────────────────────────────────────

/**
 * Error simple con un único mensaje.
 * Úsalo para errores de red, timeouts o respuestas inesperadas.
 */
export function errorResult(message: string): ApiError {
  return {
    ok: false,
    statusCode: 0, // Sin respuesta HTTP (error de red, timeout, parseo local)
    errors: [message],
  };
}

/**
 * Error construido a partir de un ZodError (validación en cliente).
 */
export function zodValidationErrorResult(error: ZodError): ApiError {
  const validationErrors = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;

  const errors = Object.values(validationErrors).flatMap((msgs) => msgs ?? []);

  return {
    ok: false,
    statusCode: 0, // Validación local, no hay respuesta HTTP
    validationErrors,
    errors,
  };
}

/**
 * Error construido a partir de una respuesta HTTP fallida del servidor.
 *
 * Delega el parseo al adaptador activo (FastAPI, Laravel, etc.).
 * Si el adaptador no reconoce el formato, usa el fallbackMessage.
 */
export async function serverErrorResult(
  res: Response,
  fallbackMessage: string,
): Promise<ApiError> {
  const body = await parseResponseBody(res);
  const statusCode = res.status;

  const validationErrors = activeBackendAdapter.parseValidationErrors(body);
  if (validationErrors) {
    return {
      ok: false,
      statusCode,
      validationErrors,
      errors: flattenValidationErrors(validationErrors),
    };
  }

  const parsedErrors = activeBackendAdapter.parseErrors(body);
  if (parsedErrors && parsedErrors.errors.length > 0) {
    return {
      ok: false,
      statusCode,
      code: parsedErrors.code,
      errors: parsedErrors.errors,
    };
  }

  return { ...errorResult(fallbackMessage), statusCode };
}

// ─── Utilidad auxiliar ───────────────────────────────────────────────────────

/**
 * Convierte un Record de errores de validación en un array de mensajes planos.
 * Útil para mostrar todos los errores en un toast o lista.
 */
export function mapValidationErrorsToMessages(
  validationErrors: Record<string, string[] | undefined>,
): string[] {
  return Object.values(validationErrors).flatMap((msgs) => msgs ?? []);
}
