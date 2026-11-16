import type { ApiError } from "@/api/apiResults";

/** Sin respuesta HTTP (red caída, timeout). */
export function errorResult(message: string): ApiError {
  return { ok: false, statusCode: 0, errors: [message] };
}

/** Validación hecha en el Provider antes de llamar al backend. */
export function invalidResult(message: string): ApiError {
  return { ok: false, statusCode: 400, code: "VALIDACION", errors: [message] };
}

/**
 * Lee el error de FastAPI. Formatos posibles:
 *   { error: { code, message } }        ← errores de dominio (app/core/errors.py)
 *   { detail: "..." }                   ← HTTPException
 *   { detail: [{ loc, msg }, ...] }     ← validación (422)
 */
export async function serverErrorResult(res: Response, fallbackMessage: string): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const error = body?.error;
  const detail = body?.detail;

  let code: string | undefined;
  let message: unknown;
  if (typeof error?.message === "string") {
    code = typeof error.code === "string" ? error.code : undefined;
    message = error.message;
  } else if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail[0]?.msg;
  }

  const text = typeof message === "string" && message.trim() ? message.trim() : fallbackMessage;
  return { ok: false, statusCode: res.status, code, errors: [text] };
}
