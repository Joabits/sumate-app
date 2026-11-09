/** Llamadas HTTP al backend para las horas de voluntariado. */

import type { ApiActionResult, ApiResult } from "./apiResults";
import { apiRequestData, apiRequestStatus } from "./http";
import type { Constancia, HorasActividad } from "@/horas/context/horasTypes";
import {
  ConstanciaResponseSchema,
  HorasActividadResponseSchema,
  horasMapper,
} from "./schemas/horasSchemas";

const BASE_URL = `${import.meta.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"}/horas`;

export const horasApi = {
  async getHorasDeActividad(activityId: string): Promise<ApiResult<HorasActividad>> {
    return apiRequestData({
      url: `${BASE_URL}/actividades/${activityId}`,
      method: "GET",
      responseSchema: HorasActividadResponseSchema,
      mapData: horasMapper.toHorasActividad,
      fallbackMessage: "Error al cargar las horas de la actividad.",
    });
  },

  async getConstancia(): Promise<ApiResult<Constancia>> {
    return apiRequestData({
      url: `${BASE_URL}/constancia`,
      method: "GET",
      responseSchema: ConstanciaResponseSchema,
      mapData: horasMapper.toConstancia,
      fallbackMessage: "Error al cargar la constancia.",
    });
  },

  async registrarJornada(
    activityId: string,
    jornada: string,
    registros: { userId: string; horas: number }[],
  ): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/actividades/${activityId}/jornadas`,
      method: "POST",
      body: {
        jornada,
        registros: registros.map((r) => ({ user_id: r.userId, horas: r.horas })),
      },
      fallbackMessage: "Error al registrar la jornada.",
    });
  },

  async corregir(registroId: string, horas: number): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${registroId}`,
      method: "PATCH",
      body: { horas },
      fallbackMessage: "Error al corregir las horas.",
    });
  },

  async aceptar(registroId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${registroId}/aceptar`,
      method: "POST",
      fallbackMessage: "Error al aceptar las horas.",
    });
  },

  async reclamar(registroId: string, motivo: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${registroId}/reclamar`,
      method: "POST",
      body: { motivo },
      fallbackMessage: "Error al enviar el reclamo.",
    });
  },
};
