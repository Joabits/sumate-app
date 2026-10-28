/**
 * src/features/activities/infrastructure/mappers/activity.mapper.ts
 *
 * Mapeo bidireccional entre los contratos snake_case del backend
 * y las entidades camelCase del frontend.
 */

import type {
  ActivityDetail,
  ActivityDetailData,
  ActivityListItem,
  Cause,
  MyActivityListItem,
} from "../../domain/entities/activity.entity";
import type {
  ActivityDetailDataResponse,
  ActivityDetailResponse,
  ActivityListItemResponse,
  ActivityListResponse,
  CauseListResponse,
  CauseResponse,
  MyActivityListItemResponse,
  MyActivityListResponse,
} from "../schemas/activity.schemas";

export const activityMapper = {
  toCause(dto: CauseResponse): Cause {
    return {
      id: dto.id,
      name: dto.name,
      slug: dto.slug,
    };
  },

  toCauseList(dto: CauseListResponse): Cause[] {
    return dto.items.map(activityMapper.toCause);
  },

  toActivityListItem(dto: ActivityListItemResponse): ActivityListItem {
    return {
      id: dto.id,
      name: dto.name,
      imageUrl: dto.image_url,
      date: dto.date,
      ownerId: dto.owner_id,
      capacity: dto.capacity,
      status: dto.status,
      creatorName: dto.creator_name ?? undefined,
      creatorImage: dto.creator_image ?? undefined,
      causes: (dto.causes ?? []).map(activityMapper.toCause),
      registeredCount: dto.registered_count,
    };
  },

  toMyActivityListItem(dto: MyActivityListItemResponse): MyActivityListItem {
    return {
      ...activityMapper.toActivityListItem(dto),
      registeredCount: dto.registered_count,
    };
  },

  toActivityList(dto: ActivityListResponse): ActivityListItem[] {
    return dto.items.map(activityMapper.toActivityListItem);
  },

  toMyActivityList(dto: MyActivityListResponse): MyActivityListItem[] {
    return dto.items.map(activityMapper.toMyActivityListItem);
  },

  toActivityDetail(dto: ActivityDetailResponse | null | undefined): ActivityDetail | null {
    if (!dto) return null;
    return {
      id: dto.id,
      activityId: dto.activity_id,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      place: dto.place ?? null,
      address: dto.address ?? null,
      description: dto.description ?? null,
    };
  },

  toActivityDetailData(dto: ActivityDetailDataResponse): ActivityDetailData {
    return {
      id: dto.id,
      name: dto.name,
      imageUrl: dto.image_url,
      date: dto.date,
      ownerId: dto.owner_id,
      capacity: dto.capacity,
      status: dto.status,
      creatorName: dto.creator_name ?? undefined,
      creatorImage: dto.creator_image ?? undefined,
      isOwner: dto.is_owner,
      isParticipating: dto.is_participating ?? false,
      participants: (dto.participants ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image ?? null,
      })),
      detail: activityMapper.toActivityDetail(dto.detail),
      causes: (dto.causes ?? []).map(activityMapper.toCause),
    };
  },
};
