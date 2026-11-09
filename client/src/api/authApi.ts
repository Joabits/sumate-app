/**
 * Llamadas de autenticación a Better Auth (desde el navegador).
 * Cada función devuelve { ok: true } o { ok: false, message } con el mensaje en español.
 */

import type { AuthResult } from "@/auth/context/authTypes";
import { authClient } from "./authClient";
import { getAuthErrorMessage } from "./authErrors";
import { clearJWT } from "./jwtManager";

type BetterAuthError = { code?: string } | null;

function toResult(error: BetterAuthError): AuthResult {
  return error ? { ok: false, message: getAuthErrorMessage(error.code) } : { ok: true };
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResult> {
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/home",
      rememberMe: false,
    });
    return toResult(error);
  },

  async signup(name: string, email: string, password: string): Promise<AuthResult> {
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/home",
    });
    return toResult(error);
  },

  async logout(): Promise<AuthResult> {
    // El JWT en memoria se descarta antes, así no queda un token de la sesión anterior
    clearJWT();
    const { error } = await authClient.signOut();
    return error
      ? { ok: false, message: "Tuvimos un error al cerrar tu sesión." }
      : { ok: true };
  },

  async loginWithGoogle(callbackURL = "/explore"): Promise<AuthResult> {
    // Si sale bien, el navegador se va a Google: esta promesa no vuelve
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: "/auth/login?error=social",
    });
    return toResult(error);
  },

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const { error } = await authClient.requestPasswordReset({
      email,
      // Better Auth agrega ?token=... a esta URL en el correo
      redirectTo: "/auth/reset-password",
    });
    return toResult(error);
  },

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    const { error } = await authClient.resetPassword({ newPassword, token });
    return toResult(error);
  },
};
