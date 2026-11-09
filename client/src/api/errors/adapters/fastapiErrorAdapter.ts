/**
 * Adaptador de errores para FastAPI
 *
 * Estructura de errores que genera FastAPI por defecto:
 *
 * Error genérico (cualquier HTTPException):
 *   { "detail": "Not found" }
 *
 * Error de validación (422 Unprocessable Entity — RequestValidationError):
 *   {
 *     "detail": [
 *       { "loc": ["body", "email"], "msg": "field required", "type": "value_error.missing" }
 *     ]
 *   }
 *
 * Documentación: https://fastapi.tiangolo.com/tutorial/handling-errors/
 */
import type { BackendErrorAdapter } from "./backendErrorAdapter";

type FastApiValidationIssue = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isFastApiValidationIssue(item: unknown): item is FastApiValidationIssue {
  const obj = asObject(item);
  return (
    obj !== null &&
    Array.isArray(obj["loc"]) &&
    typeof obj["msg"] === "string"
  );
}

export const fastapiErrorAdapter: BackendErrorAdapter = {
  parseErrors(data: unknown): { code?: string; errors: string[] } | null {
    const payload = asObject(data);
    if (!payload) return null;

    // 1. Formato DDD: { "error": { "code": "...", "message": "..." } }
    const errorObj = asObject(payload["error"]);
    if (errorObj && typeof errorObj["message"] === "string") {
      return {
        code: typeof errorObj["code"] === "string" ? errorObj["code"] : undefined,
        errors: [errorObj["message"]],
      };
    }

    // 2. Formato Nativo de FastAPI (Fallback): { "detail": "..." }
    const detail = payload["detail"];

    if (typeof detail === "string" && detail.trim()) {
      return { errors: [detail.trim()] };
    }

    if (Array.isArray(detail) && detail.every(isFastApiValidationIssue)) {
      const firstMessage = detail[0]?.msg;
      return firstMessage ? { errors: [firstMessage] } : null;
    }

    return null;
  },

  parseValidationErrors(data: unknown): Record<string, string[]> | null {
    const payload = asObject(data);
    if (!payload) return null;

    const detail = payload["detail"];

    // Errores de validación: { detail: [{ loc: ["body", "field"], msg: "..." }] }
    if (!Array.isArray(detail) || !detail.every(isFastApiValidationIssue)) {
      return null;
    }

    const fieldErrors: Record<string, string[]> = {};

    for (const issue of detail) {
      // loc puede ser ["body", "field_name"] o ["body", "field", "nested"]
      // Tomamos el último segmento que sea string como nombre del campo
      const fieldSegments = issue.loc.filter((s) => typeof s === "string");
      const field = fieldSegments[fieldSegments.length - 1] as string | undefined;

      if (!field || field === "body") continue;

      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.msg);
    }

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
  },
};
