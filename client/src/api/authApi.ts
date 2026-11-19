/**
 * Llamadas a Better Auth desde el navegador. Solo hacen la llamada y devuelven
 * el código de error: a dónde redirigir y qué mensaje mostrar lo decide AuthProvider.
 */
import { authClient } from "./authClient";
import { clearJWT } from "./jwtManager";

export type AuthCallResult = { ok: true } | { ok: false; code?: string };

function toResult({ error }: { error: { code?: string } | null }): AuthCallResult {
  return error ? { ok: false, code: error.code } : { ok: true };
}

export const authApi = {
  login: async (data: { email: string; password: string; callbackURL: string; rememberMe: boolean }) =>
    toResult(await authClient.signIn.email(data)),

  signup: async (data: { name: string; email: string; password: string; callbackURL: string }) =>
    toResult(await authClient.signUp.email(data)),

  logout: async () => {
    // El JWT en memoria se descarta antes, así no queda un token de la sesión anterior
    clearJWT();
    return toResult(await authClient.signOut());
  },

  /** Better Auth agrega ?token=... a `redirectTo` en el correo. */
  requestPasswordReset: async (data: { email: string; redirectTo: string }) =>
    toResult(await authClient.requestPasswordReset(data)),

  resetPassword: async (data: { token: string; newPassword: string }) =>
    toResult(await authClient.resetPassword(data)),
};
