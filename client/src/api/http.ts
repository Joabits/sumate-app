/**
 * Cliente HTTP para FastAPI. Manda el JWT de Better Auth (salvo `withAuth: false`)
 * y, si el backend responde 401, renueva el token y reintenta una sola vez.
 * FastAPI autentica antes de ejecutar nada, así que reintentar no duplica acciones.
 */
import type { ApiActionResult, ApiResult } from "./apiResults";
import { errorResult, serverErrorResult } from "@/api/errors/apiError";
import { clearJWT, getJWT, refreshJWT } from "./jwtManager";

type RequestConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON, o FormData para subir archivos */
  body?: unknown;
  withAuth?: boolean;
  fallbackMessage: string;
};

const CONNECTION_ERROR = "Error de conexión. Intenta más tarde.";

function send(config: RequestConfig, token: string | null): Promise<Response> {
  const isForm = config.body instanceof FormData;
  const hasJson = config.body !== undefined && !isForm;
  return fetch(config.url, {
    method: config.method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(hasJson ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? (config.body as FormData) : hasJson ? JSON.stringify(config.body) : undefined,
  });
}

async function request(config: RequestConfig): Promise<Response> {
  if (config.withAuth === false) return send(config, null);

  const res = await send(config, await getJWT());
  if (res.status !== 401) return res;

  const fresh = await refreshJWT();
  if (!fresh) return res;

  const retry = await send(config, fresh);
  // Un segundo 401 no debe dejar en memoria un token que el backend rechaza
  if (retry.status === 401) clearJWT();
  return retry;
}

/**
 * Para endpoints que devuelven datos. El backend ya responde en camelCase con
 * los tipos de la app, así que el JSON se usa tal cual. `mapData` solo hace
 * falta para sacar algo de adentro (por ejemplo `items` de una lista).
 */
export async function apiRequestData<TResult, TJson = TResult>(
  config: RequestConfig & { mapData?: (json: TJson) => TResult },
): Promise<ApiResult<TResult>> {
  try {
    const res = await request(config);
    if (!res.ok) return serverErrorResult(res, config.fallbackMessage);
    const json = (await res.json()) as TJson;
    return { ok: true, data: config.mapData ? config.mapData(json) : (json as unknown as TResult) };
  } catch {
    return errorResult(CONNECTION_ERROR);
  }
}

/** Para acciones donde solo importa si salió bien. Acepta JSON o FormData. */
export async function apiRequestStatus(config: RequestConfig): Promise<ApiActionResult> {
  try {
    const res = await request(config);
    if (!res.ok) return serverErrorResult(res, config.fallbackMessage);
    return { ok: true };
  } catch {
    return errorResult(CONNECTION_ERROR);
  }
}
