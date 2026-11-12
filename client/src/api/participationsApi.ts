/**
 * Llamadas HTTP al backend para participaciones. Solo hace la petición y
 * convierte la respuesta: las reglas están en ParticipationsProvider.
 */

import type {
  ApiActionResult,
  ApiResult,
} from "./apiResults";
import {
  apiRequestData,
  apiRequestStatus,
} from "./http";
import type { ParticipatedActivityListItem, Retiro } from "@/participations/context/participationsTypes";
import { participationMapper } from "@/api/mappers/participationsMapper";

const BASE_URL = `${import.meta.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"}/participaciones`;

export const participationsApi = {
  async joinActivity(activityId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}`,
      method: "POST",
      fallbackMessage: "Error al enviar la solicitud de participación.",
    });
  },

  async aceptarSolicitud(activityId: string, participanteId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}/solicitudes/${encodeURIComponent(participanteId)}/aceptar`,
      method: "POST",
      fallbackMessage: "Error al aceptar la solicitud.",
    });
  },

  async rechazarSolicitud(activityId: string, participanteId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}/solicitudes/${encodeURIComponent(participanteId)}/rechazar`,
      method: "POST",
      fallbackMessage: "Error al rechazar la solicitud.",
    });
  },

  async retirarse(activityId: string, motivo: string | null): Promise<ApiResult<Retiro>> {
    return apiRequestData({
      url: `${BASE_URL}/${activityId}/retiro`,
      method: "POST",
      body: { motivo },
      mapData: participationMapper.toRetiro,
      fallbackMessage: "No se pudo completar tu retiro de la actividad.",
    });
  },

  async listMyParticipations(): Promise<ApiResult<ParticipatedActivityListItem[]>> {
    return apiRequestData({
      url: `${BASE_URL}/me`,
      method: "GET",
      mapData: participationMapper.toParticipatedActivityList,
      fallbackMessage: "Error al cargar el historial de participaciones.",
    });
  },
};
