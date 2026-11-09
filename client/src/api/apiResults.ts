/**
 * Cuando la API falla.
 *
 * `statusCode` refleja el HTTP status del backend (404, 422, 500, etc.).
 * Úsalo en páginas y Server Actions para decidir qué hacer con el error:
 *   - 404 → notFound()
 *   - 401 → redirect("/login")
 *   - 422 → mostrar errores de validación
 *   - 500 → mostrar mensaje genérico
 *
 * Cuando el error es de red o de parseo local (sin respuesta HTTP),
 * `statusCode` es 0.
 */
export type ApiError = {
  ok: false;
  statusCode: number;
  code?: string;
  errors: string[];
  validationErrors?: Record<string, string[] | undefined>;
  data?: null;
};

/**
 * Cuando todo sale bien y hay data.
 */
export type ApiOk<T> = {
  ok: true;
  data: T;
};

/**
 * Cuando todo sale bien y solo importa el ok.
 */
export type ApiStatusOk = {
  ok: true;
};

/**
 * Resultado para endpoints que devuelven data.
 */
export type ApiResult<T> = ApiOk<T> | ApiError;

/**
 * Resultado para consultas donde data puede venir null.
 */
export type ApiMaybeResult<T> = ApiOk<T | null> | ApiError;

/**
 * Resultado para acciones donde solo importa el estado.
 */
export type ApiStatusResult = ApiStatusOk | ApiError;

/**
 * Alias para representar un error.
 */
export type ApiErrorResult = ApiError;

/**
 * Alias para un ok con data.
 */
export type ApiSuccessResult<T> = ApiOk<T>;

/**
 * Alias para un ok sin data.
 */
export type ApiStatus = ApiStatusOk;

/**
 * Alias para un lookup.
 */
export type ApiLookupResult<T> = ApiMaybeResult<T>;

/**
 * Alias para resultado nullable.
 */
export type ApiNullableResult<T> = ApiMaybeResult<T>;

/**
 * Alias para acciones (create, update, delete).
 */
export type ApiActionResult = ApiStatusResult;

/**
 * Alias para ok o error sin data.
 */
export type ApiStatusOrErrorResult = ApiStatusResult;

export type ApiFile = {
  fileName: string;
  contentType: string;
  blob: Blob;
};

export type ApiFileResult = ApiOk<ApiFile> | ApiError;
