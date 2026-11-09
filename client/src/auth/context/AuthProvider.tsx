import { useMemo, type ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { authClient } from "@/api/authClient";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue, AuthResult } from "./authTypes";

/**
 * Envuelve toda la app (main.tsx). Lee la sesión de Better Auth y ofrece
 * login, registro y cierre de sesión a cualquier componente.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, isRefetching, refetch } = authClient.useSession();
  const user = session?.user ?? null;

  const value = useMemo<AuthContextValue>(() => {
    // Después de entrar o salir se espera la sesión nueva, así las rutas
    // protegidas (routers/PrivateRoute) ya ven el cambio al navegar.
    const thenRefresh =
      <A extends unknown[]>(action: (...args: A) => Promise<AuthResult>) =>
      async (...args: A) => {
        const result = await action(...args);
        if (result.ok) await refetch();
        return result;
      };

    return {
      user: user
        ? { id: user.id, name: user.name, email: user.email, image: user.image }
        : null,
      // Mientras se vuelve a consultar sin sesión aún, se considera "cargando"
      isLoading: isPending || (isRefetching && !user),
      login: thenRefresh(authApi.login),
      signup: thenRefresh(authApi.signup),
      logout: thenRefresh(authApi.logout),
      loginWithGoogle: authApi.loginWithGoogle,
      requestPasswordReset: authApi.requestPasswordReset,
      resetPassword: authApi.resetPassword,
    };
  }, [user, isPending, isRefetching, refetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
