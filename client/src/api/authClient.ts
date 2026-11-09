import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  /**
   * Base URL del servidor de autenticación.
   * En desarrollo apunta a localhost; en producción a tu dominio.
   *
   * Debe coincidir con BETTER_AUTH_URL en el servidor.
   */
  baseURL: import.meta.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  plugins: [
    /**
     * Cliente del JWT Plugin.
     * Agrega el método `authClient.jwt.getToken()` que llama a
     * GET /api/auth/token usando la cookie de sesión activa.
     */
    jwtClient(),
  ],
});