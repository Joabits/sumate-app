/** Llamadas HTTP al backend para la analítica de interacción. */

import type { ApiActionResult, ApiResult } from "./apiResults";
import { apiRequestData, apiRequestStatus } from "./http";
import type { Analitica } from "@/analitica/analiticaTypes";
import { AnaliticaResponseSchema, analiticaMapper } from "./schemas/analiticaSchemas";

const BASE_URL = import.meta.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api";

export const analiticaApi = {
  async registrarEvento(evento: string, props: Record<string, unknown>): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/eventos`,
      method: "POST",
      body: { evento, props },
      fallbackMessage: "No se pudo registrar el evento.",
    });
  },

  async getAnalitica(): Promise<ApiResult<Analitica>> {
    return apiRequestData({
      url: `${BASE_URL}/analitica`,
      method: "GET",
      responseSchema: AnaliticaResponseSchema,
      mapData: analiticaMapper.toAnalitica,
      fallbackMessage: "Error al cargar la analítica.",
    });
  },
};
