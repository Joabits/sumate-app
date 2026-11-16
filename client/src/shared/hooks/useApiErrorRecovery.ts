import { startTransition } from "react";
import { useNavigate } from "react-router";
import type { ApiError } from "@/api/apiResults";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "@/shared/components/Toast";

/**
 * Resuelve los errores que no dependen del formulario (sesión vencida, sin
 * conexión...). Devuelve true si ya lo resolvió, false si le toca al componente.
 */
export function useApiErrorRecovery() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return async (error: ApiError): Promise<boolean> => {
    if (error.statusCode === 401) {
      const result = await logout();
      if (!result.ok) {
        appToast.error("Sesión no válida", "No pudimos cerrar tu sesión. Intenta nuevamente.");
        return true;
      }
      startTransition(() => {
        navigate("/auth/login?reason=session-expired", { replace: true });
      });
      return true;
    }

    // El backend ya rechazó la acción; no revelamos detalles de permisos.
    if (error.statusCode === 403) return true;

    if (error.statusCode === 503 && error.code === "AUTH_PROVIDER_UNAVAILABLE") {
      appToast.error("No podemos verificar tu sesión", "Intenta nuevamente en unos segundos.");
      return true;
    }

    if (error.statusCode === 0) {
      appToast.error("Error de conexión", "Revisa tu conexión e intenta nuevamente.");
      return true;
    }

    return false;
  };
}
