/**
 * src/features/participations/infrastructure/repositories/participation.repository.ts
 *
 * Implementación HTTP de ParticipationRepository utilizando api-client.
 */

import type {
  ApiActionResult,
  ApiResult,
} from "@/features/shared/domain/types/api-results";
import {
  apiRequestData,
  apiRequestStatus,
} from "@/features/shared/infrastructure/http/api-client";
import type { ParticipatedActivityListItem } from "../../domain/entities/participation.entity";
import type { ParticipationRepository } from "../../domain/repositories/participation.repository";
import { participationMapper } from "../mappers/participation.mapper";
import { ParticipatedActivityListResponseSchema } from "../schemas/participation.schemas";

const BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"}/participations`;

export const participationRepositoryImpl: ParticipationRepository = {
  async joinActivity(activityId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}`,
      method: "POST",
      fallbackMessage: "Error al enviar la solicitud de participación.",
    });
  },

  async acceptRequest(activityId: string, participantId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}/requests/${encodeURIComponent(participantId)}/accept`,
      method: "POST",
      fallbackMessage: "Error al aceptar la solicitud.",
    });
  },

  async rejectRequest(activityId: string, participantId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}/requests/${encodeURIComponent(participantId)}/reject`,
      method: "POST",
      fallbackMessage: "Error al rechazar la solicitud.",
    });
  },

  async leaveActivity(activityId: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${activityId}`,
      method: "DELETE",
      fallbackMessage: "Error al cancelar la participación en la actividad.",
    });
  },

  async listMyParticipations(): Promise<ApiResult<ParticipatedActivityListItem[]>> {
    return apiRequestData({
      url: `${BASE_URL}/me`,
      method: "GET",
      next: { revalidate: 30, tags: ["participations", "participations-me"] },
      responseSchema: ParticipatedActivityListResponseSchema,
      mapData: participationMapper.toParticipatedActivityList,
      fallbackMessage: "Error al cargar el historial de participaciones.",
    });
  },
};
