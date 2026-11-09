import { startTransition } from "react";
import { useNavigate } from "react-router";
import { classifyApiError, type ApiErrorLike } from "@/api/errors/errorClassification";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "@/shared/components/Toast";

/**
 * Resuelve errores de autenticacion desde componentes cliente. Mantiene la
 * navegacion fuera de api-client para que ese modulo siga siendo isomorfo.
 */
export function useApiErrorRecovery() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return async (error: ApiErrorLike): Promise<boolean> => {
    switch (classifyApiError(error)) {
      case "unauthenticated": {
        const result = await logout();
        if (!result.ok) {
          appToast.error(
            "Sesión no válida",
            "No pudimos cerrar tu sesión. Intenta nuevamente.",
          );
          return true;
        }

        startTransition(() => {
          navigate("/auth/login?reason=session-expired", { replace: true });
        });
        return true;
      }

      case "forbidden":
        // El backend ya rechazó la acción. No renovamos ni cerramos la sesión,
        // y la política actual de la app evita revelar detalles de permisos.
        return true;

      case "auth-provider-unavailable":
        appToast.error(
          "No podemos verificar tu sesión",
          "Intenta nuevamente en unos segundos.",
        );
        return true;

      case "connection":
        appToast.error(
          "Error de conexión",
          "Revisa tu conexión e intenta nuevamente.",
        );
        return true;

      case "other":
        return false;
    }
  };
}
