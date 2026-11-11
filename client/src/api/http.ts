/**
 * API Client \u2014 Cliente HTTP para peticiones al backend externo.
 *
 * Caracter\u00edsticas:
 *   \u2022 Inyecci\u00f3n autom\u00e1tica de JWT (withAuth: true por defecto).
 *   \u2022 Retry autom\u00e1tico en 401: refresca el JWT y reintenta una sola vez.
 *   \u2022 Parseo de errores delegado al adaptador de backend activo
 *     (ver features/shared/infrastructure/errors/adapters/).
 *   \u2022 5 tipos de petici\u00f3n seg\u00fan la intenci\u00f3n: Data, MaybeData, Status,
 *     FormStatus y File.
 *
 * Configuraci\u00f3n de autenticaci\u00f3n:
 *   withAuth: true  (default) \u2192 inyecta JWT autom\u00e1ticamente
 *   withAuth: false           \u2192 petici\u00f3n p\u00fablica sin token
 *
 * Ejemplo de uso:
 *   // Endpoint protegido (default)
 *   await apiRequestData({ url: "/api/schools", method: "GET", ... });
 *
 *   // Endpoint p\u00fablico
 *   await apiRequestData({ url: "/api/public", method: "GET", withAuth: false, ... });
 */

import {
  ApiActionResult,
  ApiFileResult,
  ApiMaybeResult,
  ApiResult,
} from "./apiResults";
import { errorResult, serverErrorResult } from "@/api/errors/apiError";
import { clearJWT, getJWT, refreshJWT } from "./jwtManager";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestConfig = {
  url: string;
  method: ApiMethod;
  /**
   * Si es true (por defecto), obtiene el JWT autom\u00e1ticamente y lo
   * env\u00eda en el header `Authorization: Bearer <token>`.
   *
   * Establece false para endpoints p\u00fablicos que no requieren autenticaci\u00f3n.
   */
  withAuth?: boolean;
  cache?: RequestCache;
  body?: unknown;
};

type DataRequestConfig<TJson, TResult> = RequestConfig & {
  fallbackMessage: string;
  /** Convierte el JSON del backend (snake_case) a los tipos de la app */
  mapData: (json: TJson) => TResult;
};

type MaybeDataRequestConfig<TJson, TResult> = RequestConfig & {
  fallbackMessage: string;
  mapData?: (json: TJson) => TResult;
  /** HTTP status que representa "no encontrado" en este endpoint. Por defecto: 404. */
  notFoundStatus?: number;
  /**
   * Codigo de dominio esperado para interpretar notFoundStatus como data null.
   * Usalo cuando un mismo endpoint puede devolver 404 por mas de una razon.
   */
  notFoundCode?: string;
};

type StatusRequestConfig = RequestConfig & {
  fallbackMessage: string;
};

type FormStatusRequestConfig = Omit<RequestConfig, "body"> & {
  fallbackMessage: string;
  body: FormData;
};

type FileRequestConfig = RequestConfig & {
  fallbackMessage: string;
  defaultFileName: string;
  defaultContentType?: string;
};

// ─── Internos ────────────────────────────────────────────────────────────────

/** Construye los headers de la petici\u00f3n, incluyendo el JWT si se proporciona. */
function buildHeaders(token?: string | null, hasJsonBody?: boolean): HeadersInit {
  return {
    Accept: "application/json",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Obtiene el JWT de manera segura.
 * Retorna null (sin lanzar) si no hay sesi\u00f3n activa o si ocurre un error.
 */
async function resolveToken(withAuth: boolean): Promise<string | null> {
  if (!withAuth) return null;
  try {
    return await getJWT();
  } catch {
    return null;
  }
}

/** Ejecuta un fetch JSON. Reutilizado por todas las funciones p\u00fablicas. */
async function doRequest(config: RequestConfig, token: string | null): Promise<Response> {
  const hasBody = config.body !== undefined;
  return fetch(config.url, {
    method: config.method,
    headers: buildHeaders(token, hasBody),
    // Siempre datos frescos del backend
    cache: config.cache ?? "no-store",
    ...(hasBody ? { body: JSON.stringify(config.body) } : {}),
  });
}

/** Ejecuta un fetch con FormData. */
async function doFormRequest(
  config: FormStatusRequestConfig,
  token: string | null,
): Promise<Response> {
  return fetch(config.url, {
    method: config.method,
    headers: buildHeaders(token, false),
    cache: config.cache,
    body: config.body,
  });
}

/**
 * Intenta refrescar el JWT y retorna el nuevo token.
 * Si el refresco falla (sesi\u00f3n expirada), retorna null.
 */
async function tryRefreshToken(): Promise<string | null> {
  try {
    return await refreshJWT();
  } catch {
    return null;
  }
}

type RequestExecutor = (token: string | null) => Promise<Response>;

/**
 * Ejecuta una peticion autenticada y permite un solo refresh tras 401.
 * FastAPI autentica antes de ejecutar el caso de uso, por lo que este retry
 * no duplica una mutacion que haya sido rechazada por autenticacion.
 */
async function executeWithAuthRetry(
  withAuth: boolean,
  execute: RequestExecutor,
): Promise<Response> {
  const token = await resolveToken(withAuth);
  let res = await execute(token);

  if (!withAuth || res.status !== 401) return res;

  const refreshedToken = await tryRefreshToken();
  if (!refreshedToken) {
    clearJWT();
    return res;
  }

  res = await execute(refreshedToken);

  // Un segundo 401 no debe crear un loop ni dejar un token rechazado en cache.
  if (res.status === 401) {
    clearJWT();
  }

  return res;
}

// ─── API P\u00fablica ──────────────────────────────────────────────────────────────

/**
 * Para endpoints que devuelven datos.
 * Convierte la respuesta con el mapper indicado.
 * Reintenta autom\u00e1ticamente con JWT renovado en caso de 401.
 */
export async function apiRequestData<TJson, TResult>(
  config: DataRequestConfig<TJson, TResult>,
): Promise<ApiResult<TResult>> {
  const withAuth = config.withAuth !== false;

  try {
    const res = await executeWithAuthRetry(withAuth, (token) =>
      doRequest(config, token),
    );

    // Retry en 401: el JWT expir\u00f3, refrescamos y reintentamos una vez
    if (!res.ok) {
      return serverErrorResult(res, config.fallbackMessage);
    }

    const json = (await res.json()) as TJson;
    return { ok: true, data: config.mapData(json) };
  } catch {
    return errorResult("Error de conexi\u00f3n. Intenta m\u00e1s tarde.");
  }
}

/**
 * Para endpoints donde la data puede ser null (ej: buscar por ID que no existe).
 * Trata el status notFoundStatus (default 404) como ok con data: null.
 * Reintenta autom\u00e1ticamente con JWT renovado en caso de 401.
 */
export async function apiRequestMaybeData<TJson, TResult = TJson>(
  config: MaybeDataRequestConfig<TJson, TResult>,
): Promise<ApiMaybeResult<TResult>> {
  const withAuth = config.withAuth !== false;

  try {
    const res = await executeWithAuthRetry(withAuth, (token) =>
      doRequest(config, token),
    );

    // Retry en 401
    if (res.status === (config.notFoundStatus ?? 404)) {
      if (!config.notFoundCode) {
        return { ok: true, data: null };
      }

      const notFoundError = await serverErrorResult(res, config.fallbackMessage);
      if (notFoundError.code === config.notFoundCode) {
        return { ok: true, data: null };
      }

      return notFoundError;
    }

    if (!res.ok) {
      return serverErrorResult(res, config.fallbackMessage);
    }

    const json = (await res.json()) as TJson;
    return {
      ok: true,
      data: config.mapData ? config.mapData(json) : (json as unknown as TResult),
    };
  } catch {
    return errorResult("Error de conexi\u00f3n. Intenta m\u00e1s tarde.");
  }
}

/**
 * Para endpoints donde solo importa el status de la respuesta.
 * Usado en operaciones CRUD (create, update, delete) sin data de retorno.
 * Reintenta autom\u00e1ticamente con JWT renovado en caso de 401.
 */
export async function apiRequestStatus(
  config: StatusRequestConfig,
): Promise<ApiActionResult> {
  const withAuth = config.withAuth !== false;

  try {
    const res = await executeWithAuthRetry(withAuth, (token) =>
      doRequest(config, token),
    );

    // Retry en 401
    if (!res.ok) {
      return serverErrorResult(res, config.fallbackMessage);
    }

    return { ok: true };
  } catch {
    return errorResult("Error de conexi\u00f3n. Intenta m\u00e1s tarde.");
  }
}

/**
 * Para endpoints que reciben un FormData (subida de archivos, multipart).
 * Reintenta autom\u00e1ticamente con JWT renovado en caso de 401.
 */
export async function apiRequestFormStatus(
  config: FormStatusRequestConfig,
): Promise<ApiActionResult> {
  const withAuth = config.withAuth !== false;

  try {
    const res = await executeWithAuthRetry(withAuth, (token) =>
      doFormRequest(config, token),
    );

    // Retry en 401
    if (!res.ok) {
      return serverErrorResult(res, config.fallbackMessage);
    }

    return { ok: true };
  } catch {
    return errorResult("Error de conexi\u00f3n. Intenta m\u00e1s tarde.");
  }
}

/**
 * Para endpoints que devuelven un archivo binario.
 * Lee el nombre y tipo del archivo desde los headers de la respuesta.
 * Reintenta autom\u00e1ticamente con JWT renovado en caso de 401.
 */
export async function apiRequestFile(
  config: FileRequestConfig,
): Promise<ApiFileResult> {
  const withAuth = config.withAuth !== false;

  try {
    const res = await executeWithAuthRetry(withAuth, (token) =>
      doRequest(config, token),
    );

    // Retry en 401
    if (!res.ok) {
      return serverErrorResult(res, config.fallbackMessage);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") ?? "";
    const fileNameMatch = disposition.match(/filename="([^"]+)"/);
    const fileName = fileNameMatch?.[1] ?? config.defaultFileName;
    const contentType =
      res.headers.get("content-type") ??
      config.defaultContentType ??
      "application/octet-stream";

    return {
      ok: true,
      data: { fileName, contentType, blob },
    };
  } catch {
    return errorResult("Error de conexi\u00f3n. Intenta m\u00e1s tarde.");
  }
}
