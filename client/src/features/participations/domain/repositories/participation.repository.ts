/**
 * src/features/participations/domain/repositories/participation.repository.ts
 *
 * Contrato de repositorio para el módulo de participaciones.
 */

import type {
  ApiActionResult,
  ApiResult,
} from "@/features/shared/domain/types/api-results";
import type { ParticipatedActivityListItem } from "../entities/participation.entity";

export interface ParticipationRepository {
  /**
   * Envía la solicitud de participación del usuario actual (queda pendiente).
   */
  joinActivity(activityId: string): Promise<ApiActionResult>;

  /**
   * Cancela la solicitud o participación del usuario actual en una actividad.
   */
  leaveActivity(activityId: string): Promise<ApiActionResult>;

  /**
   * El organizador acepta la solicitud de un voluntario.
   */
  acceptRequest(activityId: string, participantId: string): Promise<ApiActionResult>;

  /**
   * El organizador rechaza la solicitud de un voluntario.
   */
  rejectRequest(activityId: string, participantId: string): Promise<ApiActionResult>;

  /**
   * Lista las actividades en las que participa o ha participado el usuario actual.
   */
  listMyParticipations(): Promise<ApiResult<ParticipatedActivityListItem[]>>;
}
