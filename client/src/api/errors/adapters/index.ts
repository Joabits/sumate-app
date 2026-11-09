/**
 * Selector de Adaptador de Backend
 *
 * Lee la variable de entorno NEXT_PUBLIC_BACKEND_ADAPTER y retorna
 * el adaptador de errores correspondiente al framework backend en uso.
 *
 * ─── Configuración ───────────────────────────────────────────────────────────
 *
 * En tu .env (o .env.local):
 *
 *   NEXT_PUBLIC_BACKEND_ADAPTER=fastapi    ← Para FastAPI / Django / Flask
 *   NEXT_PUBLIC_BACKEND_ADAPTER=laravel    ← Para Laravel / Lumen
 *
 * Si la variable no está definida, se usa FastAPI como valor por defecto.
 *
 * ─── Agregar un nuevo adaptador ──────────────────────────────────────────────
 *
 * 1. Crea `adapters/mi-framework.error-adapter.ts` implementando BackendErrorAdapter
 * 2. Importa e integra abajo en el Record `adapters`
 * 3. Actualiza la env var en tu .env
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { BackendErrorAdapter } from "./backendErrorAdapter";
import { fastapiErrorAdapter } from "./fastapiErrorAdapter";
import { laravelErrorAdapter } from "./laravelErrorAdapter";

type SupportedAdapter = "fastapi" | "laravel";

const adapters: Record<SupportedAdapter, BackendErrorAdapter> = {
  fastapi: fastapiErrorAdapter,
  laravel: laravelErrorAdapter,
};

const DEFAULT_ADAPTER: SupportedAdapter = "fastapi";

function resolveAdapter(): BackendErrorAdapter {
  const key = (
    import.meta.env.NEXT_PUBLIC_BACKEND_ADAPTER ?? DEFAULT_ADAPTER
  ).toLowerCase() as SupportedAdapter;

  const adapter = adapters[key];

  if (!adapter) {
    console.warn(
      `[BackendAdapter] Adaptador desconocido: "${key}". ` +
        `Usando "${DEFAULT_ADAPTER}" por defecto. ` +
        `Valores válidos: ${Object.keys(adapters).join(", ")}`,
    );
    return adapters[DEFAULT_ADAPTER];
  }

  return adapter;
}

/**
 * Adaptador activo. Se resuelve una sola vez al cargar el módulo.
 * Para cambiar el adaptador, modifica NEXT_PUBLIC_BACKEND_ADAPTER en tu .env y reinicia.
 */
export const activeBackendAdapter: BackendErrorAdapter = resolveAdapter();
