import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { appToast } from "@/shared/components/Toast";

const SOCIAL_ERROR_MESSAGES: Record<string, string> = {
  social:
    "Esta cuenta fue creada con email y contraseña. Inicia sesión de esa manera o usa el mismo proveedor con el que te registraste.",
};

/**
 * Componente que lee los query params de error en la URL al montarse
 * y muestra el toast correspondiente.
 * 
 * Uso: montar en páginas que reciben redirects de error de Better Auth.
 * Ejemplo: /auth/login?error=social
 */
export default function AuthErrorNotifier() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    const message =
      SOCIAL_ERROR_MESSAGES[error] ??
      "Ocurrió un error durante la autenticación. Inténtalo de nuevo.";

    appToast.error("Error de autenticación", message);
  }, [searchParams]);

  return null;
}
