import type { ApiError } from "@/api/apiResults";

/** Error minimo que pueden devolver las Server Actions y el cliente HTTP. */
export type ApiErrorLike = Pick<ApiError, "ok" | "errors"> &
  Partial<Pick<ApiError, "statusCode" | "code">>;

export type ApiErrorClassification =
  | "unauthenticated"
  | "forbidden"
  | "auth-provider-unavailable"
  | "connection"
  | "other";

/**
 * Clasifica errores de transporte sin decidir UI. La presentacion puede usar
 * este resultado para mostrar un toast, navegar o conservar la sesion.
 */
export function classifyApiError(
  error: ApiErrorLike,
): ApiErrorClassification {
  if (error.statusCode === 401) return "unauthenticated";
  if (error.statusCode === 403) return "forbidden";
  if (
    error.statusCode === 503 &&
    error.code === "AUTH_PROVIDER_UNAVAILABLE"
  ) {
    return "auth-provider-unavailable";
  }
  if (error.statusCode === 0) return "connection";

  return "other";
}
