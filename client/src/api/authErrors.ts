/**
 * Mapeo de códigos de error de Better Auth a mensajes en español.
 * 
 * Usar siempre este helper en lugar de mostrar ctx.error.message
 * directamente (que viene en inglés desde Better Auth).
 * 
 * Referencia: authClient.$ERROR_CODES
 */

const ERROR_MESSAGES: Record<string, string> = {
  // ─── Registro ───────────────────────────────────────────────────────────────
  USER_ALREADY_EXISTS:
    "Ya existe una cuenta con este email. Intenta iniciar sesión.",
  FAILED_TO_CREATE_USER:
    "No pudimos crear tu cuenta. Inténtalo de nuevo más tarde.",
  FAILED_TO_CREATE_SESSION:
    "Cuenta creada, pero no pudimos iniciar sesión. Intenta entrar manualmente.",

  // ─── Validación de campos ───────────────────────────────────────────────────
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga.",
  INVALID_EMAIL: "El formato del email no es válido.",

  // ─── Inicio de sesión ───────────────────────────────────────────────────────
  INVALID_EMAIL_OR_PASSWORD:
    "Credenciales incorrectas. Revisa tu email y contraseña.",
  EMAIL_NOT_VERIFIED:
    "Debes verificar tu email antes de continuar. Revisa tu bandeja de entrada.",
  USER_NOT_FOUND: "No encontramos ninguna cuenta con ese email.",

  // ─── Sesión / Tokens ────────────────────────────────────────────────────────
  SESSION_EXPIRED: "Tu sesión expiró. Inicia sesión de nuevo.",
  INVALID_TOKEN:
    "El enlace no es válido o ya fue utilizado. Solicita uno nuevo.",
  TOKEN_EXPIRED:
    "El enlace expiró. Solicita uno nuevo desde '¿Olvidaste tu contraseña?'.",

  // ─── Proveedores sociales ───────────────────────────────────────────────────
  ACCOUNT_NOT_LINKED:
    "Esta cuenta fue creada con email y contraseña. Inicia sesión de esa manera.",
  SOCIAL_ACCOUNT_ALREADY_LINKED:
    "Esta cuenta de Google ya está asociada a otro usuario.",
  FAILED_TO_GET_USER_INFO:
    "No pudimos obtener tu información del proveedor. Intenta de nuevo.",
  PROVIDER_NOT_FOUND: "Este método de inicio de sesión no está disponible.",
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
    "El inicio de sesión fue bloqueado por el navegador. Intenta de nuevo.",
};

/**
 * Retorna un mensaje de error amigable en español a partir del código
 * de error que devuelve Better Auth en `ctx.error.code`.
 */
export function getAuthErrorMessage(code: string | undefined): string {
  if (!code) return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  return (
    ERROR_MESSAGES[code] ?? "Ocurrió un error inesperado. Inténtalo de nuevo."
  );
}
