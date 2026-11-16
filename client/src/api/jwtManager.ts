/**
 * JWT para llamar a FastAPI. Se pide a Better Auth (GET /api/auth/token, con
 * la cookie de sesión) y se guarda solo en memoria, no en localStorage, para
 * que un script inyectado no pueda leerlo. Al recargar la página se vuelve a pedir.
 */

/** Se considera vencido 30s antes, para no mandar un token a punto de expirar. */
const EXPIRY_BUFFER_MS = 30_000;

let cached: { token: string; expiresAt: number } | null = null;
/** Si varias peticiones necesitan token a la vez, comparten la misma llamada. */
let pending: Promise<string | null> | null = null;
/** Sube en cada logout/refresh: un fetch que resuelva tarde no repone un token viejo. */
let generation = 0;

function readExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function fetchToken(gen: number): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const { token } = await res.json();
    if (typeof token !== "string" || gen !== generation) return null;

    const expiresAt = readExp(token);
    if (expiresAt && expiresAt > Date.now()) cached = { token, expiresAt };
    return token;
  } catch {
    return null;
  }
}

/** Devuelve un JWT vigente, o null si no hay sesión. */
export function getJWT(): Promise<string | null> {
  if (cached && Date.now() < cached.expiresAt - EXPIRY_BUFFER_MS) {
    return Promise.resolve(cached.token);
  }
  if (!pending) {
    const current = fetchToken(generation);
    pending = current;
    void current.finally(() => {
      if (pending === current) pending = null;
    });
  }
  return pending;
}

/** Descarta el token en memoria (al cerrar sesión o tras un 401). */
export function clearJWT(): void {
  generation += 1;
  pending = null;
  cached = null;
}

/** Pide un token nuevo descartando el actual. Lo usa http.ts tras un 401. */
export function refreshJWT(): Promise<string | null> {
  clearJWT();
  return getJWT();
}
