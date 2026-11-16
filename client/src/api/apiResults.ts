/**
 * Resultado de una llamada al backend. `statusCode` es el HTTP status
 * (0 = sin respuesta: red caída o timeout) y `code` el código de dominio
 * que manda FastAPI en `{ error: { code, message } }`.
 */
export type ApiError = {
  ok: false;
  statusCode: number;
  code?: string;
  errors: string[];
};

export type ApiResult<T> = { ok: true; data: T } | ApiError;

/** Para acciones (crear, editar, borrar) donde solo importa si salió bien. */
export type ApiActionResult = { ok: true } | ApiError;

/** Para las lecturas: devuelve los datos o lanza el error que muestra la página. */
export function datosOError<T>(response: ApiResult<T>): T {
  if (!response.ok) throw new Error(response.errors[0]);
  return response.data;
}
