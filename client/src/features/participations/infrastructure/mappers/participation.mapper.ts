/**
 * src/features/participations/infrastructure/mappers/participation.mapper.ts
 *
 * Mapeador de DTOs de infraestructura a entidades de dominio.
 */

import { activityMapper } from "@/features/activities/infrastructure/mappers/activity.mapper";
import type { ParticipatedActivityListItem } from "../../domain/entities/participation.entity";
import type {
  ParticipatedActivityItemResponse,
  ParticipatedActivityListResponse,
} from "../schemas/participation.schemas";

export const participationMapper = {
  toParticipatedActivityItem(
    dto: ParticipatedActivityItemResponse
  ): ParticipatedActivityListItem {
    return {
      id: dto.id,
      name: dto.name,
      imageUrl: dto.image_url,
      date: dto.date,
      ownerId: dto.owner_id,
      capacity: dto.capacity,
      status: dto.status,
      enrolledDate: dto.enrolled_date,
      isPast: dto.is_past,
      estadoSolicitud: dto.estado_solicitud,
      creatorName: dto.creator_name ?? undefined,
      creatorImage: dto.creator_image ?? undefined,
      causes: (dto.causes ?? []).map(activityMapper.toCause),
    };
  },

  toParticipatedActivityList(
    dto: ParticipatedActivityListResponse
  ): ParticipatedActivityListItem[] {
    return dto.items.map(participationMapper.toParticipatedActivityItem);
  },
};
