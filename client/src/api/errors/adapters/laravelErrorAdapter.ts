/**
 * Adaptador de errores para Laravel
 *
 * Estructura de errores que genera Laravel por defecto:
 *
 * Error genérico:
 *   { "message": "Unauthenticated." }
 *
 * Error de validación (422 Unprocessable Entity):
 *   {
 *     "message": "The email field is required.",
 *     "errors": {
 *       "email":    ["The email field is required."],
 *       "password": ["The password field is required."]
 *     }
 *   }
 *
 * Documentación: https://laravel.com/docs/validation#validation-error-response-format
 */
import type { BackendErrorAdapter } from "./backendErrorAdapter";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const laravelErrorAdapter: BackendErrorAdapter = {
  parseErrors(data: unknown): { code?: string; errors: string[] } | null {
    const payload = asObject(data);
    if (!payload) return null;

    // 1. Formato DDD opcional (si se usa): { "error": { "code": "...", "message": "..." } }
    const errorObj = asObject(payload["error"]);
    if (errorObj && typeof errorObj["message"] === "string") {
      return {
        code: typeof errorObj["code"] === "string" ? errorObj["code"] : undefined,
        errors: [errorObj["message"]],
      };
    }

    // Si hay errores de validación, devolvemos el primer mensaje de campo
    const validationErrors = this.parseValidationErrors(data);
    if (validationErrors) {
      const firstField = Object.keys(validationErrors)[0];
      const firstMessage = validationErrors[firstField]?.[0];
      if (firstMessage) return { errors: [firstMessage] };
    }

    // Error genérico: { message: "..." }
    if (typeof payload["message"] === "string" && payload["message"].trim()) {
      return { errors: [payload["message"].trim()] };
    }

    return null;
  },

  parseValidationErrors(data: unknown): Record<string, string[]> | null {
    const payload = asObject(data);
    if (!payload) return null;

    const errors = payload["errors"];
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
      return null;
    }

    const fieldErrors: Record<string, string[]> = {};

    for (const [field, value] of Object.entries(
      errors as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        const messages = value
          .filter((m): m is string => typeof m === "string")
          .slice(0, 1); // Solo el primer mensaje por campo
        if (messages.length > 0) {
          fieldErrors[field] = messages;
        }
      }
    }

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
  },
};
