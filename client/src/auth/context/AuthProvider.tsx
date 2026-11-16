import { useMemo, type ReactNode } from "react";
import { authApi, type AuthCallResult } from "@/api/authApi";
import { authClient } from "@/api/authClient";
import { AuthContext } from "./AuthContext";
import { getAuthErrorMessage } from "./authErrors";
import type { AuthContextValue as Ctx, AuthResult } from "./authTypes";

/** A dónde vuelve Better Auth después de entrar o registrarse con email. */
const AFTER_LOGIN = "/home";

/** Código de Better Auth → mensaje en español para la persona. */
function toAuthResult(result: AuthCallResult, message?: string): AuthResult {
  return result.ok ? result : { ok: false, message: message ?? getAuthErrorMessage(result.code) };
}

const loginWithGoogle: Ctx["loginWithGoogle"] = async (callbackURL = "/explore") =>
  toAuthResult(
    await authApi.loginWithGoogle({ callbackURL, errorCallbackURL: "/auth/login?error=social" }),
  );

const requestPasswordReset: Ctx["requestPasswordReset"] = async (email) =>
  toAuthResult(await authApi.requestPasswordReset({ email, redirectTo: "/auth/reset-password" }));

const resetPassword: Ctx["resetPassword"] = async (token, newPassword) =>
  toAuthResult(await authApi.resetPassword({ token, newPassword }));

/**
 * Envuelve toda la app (main.tsx). Lee la sesión de Better Auth y ofrece
 * login, registro y cierre de sesión a cualquier componente.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, isRefetching, refetch } = authClient.useSession();
  const sessionUser = session?.user ?? null;

  const value = useMemo<Ctx>(() => {
    const user = sessionUser
      ? { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email, image: sessionUser.image }
      : null;
    // Mientras se vuelve a consultar sin sesión aún, se considera "cargando"
    const isLoading = isPending || (isRefetching && !sessionUser);

    // Después de entrar o salir se espera la sesión nueva, así las rutas
    // protegidas (routers/PrivateRoute) ya ven el cambio al navegar.
    const conSesionNueva = async (result: AuthResult) => {
      if (result.ok) await refetch();
      return result;
    };

    const login: Ctx["login"] = async (email, password) =>
      conSesionNueva(
        toAuthResult(
          await authApi.login({ email, password, callbackURL: AFTER_LOGIN, rememberMe: false }),
        ),
      );

    const signup: Ctx["signup"] = async (name, email, password) =>
      conSesionNueva(
        toAuthResult(await authApi.signup({ name, email, password, callbackURL: AFTER_LOGIN })),
      );

    const logout: Ctx["logout"] = async () =>
      conSesionNueva(toAuthResult(await authApi.logout(), "Tuvimos un error al cerrar tu sesión."));

    return {
      user,
      isLoading,
      login,
      signup,
      logout,
      loginWithGoogle,
      requestPasswordReset,
      resetPassword,
    };
  }, [sessionUser, isPending, isRefetching, refetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
