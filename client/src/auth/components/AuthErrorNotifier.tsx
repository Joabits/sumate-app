import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { appToast } from "@/shared/components/Toast";

/**
 * Componente que lee los query params de error en la URL al montarse
 * y muestra el toast correspondiente.
 * 
 * Uso: montar en páginas que reciben redirects de error de Better Auth.
 * Ejemplo: /auth/login?error=INVALID_TOKEN
 */
export default function AuthErrorNotifier() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    appToast.error("Error de autenticación", "Ocurrió un error durante la autenticación. Inténtalo de nuevo.");
  }, [searchParams]);

  return null;
}
