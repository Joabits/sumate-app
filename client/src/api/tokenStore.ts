/**
 * Token Store \u2014 Almac\u00e9n en memoria para el JWT.
 *
 * \u00bfPor qu\u00e9 memoria y no localStorage/sessionStorage?
 *   - localStorage es vulnerable a ataques XSS. Si un script malicioso
 *     se inyecta en la p\u00e1gina, puede robar el token directamente.
 *   - En memoria, el token nunca es accesible desde scripts externos.
 *   - La contraparte es que el token se pierde al recargar la p\u00e1gina,
 *     pero eso est\u00e1 bien: el JwtManager lo re-fetcha autom\u00e1ticamente
 *     usando la cookie de sesi\u00f3n de Better Auth (que s\u00ed es httpOnly).
 *
 * \u26a0\ufe0f  SOLO CLIENTE: Este m\u00f3dulo usa estado a nivel de m\u00f3dulo.
 *   En el servidor (SSR/Server Actions), las variables de m\u00f3dulo son
 *   compartidas entre requests de todos los usuarios, lo que ser\u00eda
 *   una vulnerabilidad de seguridad.
 *   Importar este m\u00f3dulo \u00fanicamente desde componentes cliente o desde
 *   funciones que corran en el browser.
 */

type TokenEntry = {
  token: string;
  /** Timestamp en milisegundos (Date.now()) de cuando expira el JWT. */
  expiresAt: number;
};

/** Buffer de seguridad: considera el token expirado 30s antes del vencimiento real. */
const EXPIRY_BUFFER_MS = 30_000;

let _entry: TokenEntry | null = null;

export const tokenStore = {
  /**
   * Devuelve el token almacenado si sigue siendo v\u00e1lido.
   * Retorna null si no hay token o si ya expir\u00f3 (incluyendo el buffer).
   */
  get(): string | null {
    if (typeof window === "undefined") return null; // Guard server-side
    if (!_entry) return null;
    if (Date.now() >= _entry.expiresAt - EXPIRY_BUFFER_MS) {
      _entry = null;
      return null;
    }
    return _entry.token;
  },

  /**
   * Almacena el token junto a su tiempo de expiraci\u00f3n.
   * @param token    El JWT recibido de Better Auth.
   * @param expiresAt  Timestamp en ms (payload.exp * 1000).
   */
  set(token: string, expiresAt: number): void {
    if (typeof window === "undefined") return; // Guard server-side
    _entry = { token, expiresAt };
  },

  /** Invalida el token almacenado. Llama esto al cerrar sesi\u00f3n. */
  clear(): void {
    _entry = null;
  },

  /**
   * Devuelve informaci\u00f3n de depuraci\u00f3n sobre el estado del token.
   * \u00datil en desarrollo para verificar el tiempo de vida restante.
   */
  debug(): { hasToken: boolean; expiresIn: string | null; expiresAt: string | null } {
    if (!_entry) return { hasToken: false, expiresIn: null, expiresAt: null };
    const msLeft = _entry.expiresAt - Date.now();
    const minutes = Math.floor(msLeft / 1000 / 60);
    const seconds = Math.floor((msLeft / 1000) % 60);
    return {
      hasToken: true,
      expiresAt: new Date(_entry.expiresAt).toISOString(),
      expiresIn: `${minutes}m ${seconds}s`,
    };
  },
};
