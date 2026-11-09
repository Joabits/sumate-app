/**
 * Puerto — Contrato que todo adaptador de backend debe cumplir.
 *
 * Cada framework backend tiene su propia convención para estructurar
 * los errores HTTP. Este contrato desacopla la infraestructura HTTP
 * del formato específico de cada framework.
 *
 * Implementaciones disponibles:
 *   - FastAPI  → fastapi.error-adapter.ts
 *   - Laravel  → laravel.error-adapter.ts
 */
export type BackendErrorAdapter = {
  /**
   * Extrae los mensajes de error generales y el código de dominio del body de la respuesta.
   * Retorna null si el body no contiene mensajes reconocibles.
   */
  parseErrors(data: unknown): { code?: string; errors: string[] } | null;

  /**
   * Extrae los errores de validación por campo del body de la respuesta.
   * Retorna null si el body no contiene errores de validación reconocibles.
   *
   * El formato de retorno siempre es normalizado:
   *   { fieldName: ["primer mensaje de error"] }
   */
  parseValidationErrors(
    data: unknown,
  ): Record<string, string[]> | null;
};
