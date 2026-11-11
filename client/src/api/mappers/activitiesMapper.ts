/**
 * Lo que responde el backend en /activities (snake_case) y su conversión a
 * los tipos de la app (camelCase). Solo transforma datos: las reglas están
 * en ActivitiesProvider.
 */

import type {
  ActivityDetail,
  ActivityDetailData,
  ActivityListItem,
  ActivityParticipant,
  ActivityStatus,
  Cause,
  EstadoSolicitud,
  MyActivityListItem,
} from "@/activities/context/activitiesTypes";

// ── Respuestas del backend ────────────────────────────────────────────────────
export type CauseResponse = {
  id: string;
  name: string;
  slug: string;
};

export type CauseListResponse = { items: CauseResponse[] };

export type ActivityListItemResponse = {
  id: string;
  name: string;
  image_url: string;
  date: string;
  owner_id: string;
  capacity: number;
  status: ActivityStatus;
  creator_name?: string | null;
  creator_image?: string | null;
  causes?: CauseResponse[];
  registered_count?: number;
};

export type ActivityListResponse = { items: ActivityListItemResponse[] };

export type MyActivityListItemResponse = ActivityListItemResponse & { registered_count: number };

export type MyActivityListResponse = { items: MyActivityListItemResponse[] };

export type ActivityDetailResponse = {
  id: string;
  activity_id: string;
  latitude?: number | null;
  longitude?: number | null;
  place?: string | null;
  address?: string | null;
  description?: string | null;
};

export type ActivityParticipantResponse = {
  id: string;
  name: string;
  image?: string | null;
  estado_anterior?: EstadoSolicitud | null;
};

export type ActivityDetailDataResponse = ActivityListItemResponse & {
  is_owner: boolean;
  is_participating?: boolean;
  estado_solicitud?: EstadoSolicitud | null;
  participants?: ActivityParticipantResponse[];
  solicitudes_pendientes?: ActivityParticipantResponse[];
  posicion_en_espera?: number | null;
  lista_de_espera?: ActivityParticipantResponse[];
  motivo_cancelacion?: string | null;
  postulantes_cancelados?: ActivityParticipantResponse[];
  detail?: ActivityDetailResponse | null;
};

// ── Conversión ────────────────────────────────────────────────────────────────
function toParticipant(dto: ActivityParticipantResponse): ActivityParticipant {
  return { id: dto.id, name: dto.name, image: dto.image ?? null };
}

export const activityMapper = {
  toCause(dto: CauseResponse): Cause {
    return { id: dto.id, name: dto.name, slug: dto.slug };
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
      estadoSolicitud: dto.estado_solicitud ?? null,
      participants: (dto.participants ?? []).map(toParticipant),
      solicitudesPendientes: (dto.solicitudes_pendientes ?? []).map(toParticipant),
      posicionEnEspera: dto.posicion_en_espera ?? null,
      motivoCancelacion: dto.motivo_cancelacion ?? null,
      postulantesCancelados: (dto.postulantes_cancelados ?? []).map((p) => ({
        ...toParticipant(p),
        estadoAnterior: p.estado_anterior ?? null,
      })),
      listaDeEspera: (dto.lista_de_espera ?? []).map(toParticipant),
      detail: activityMapper.toActivityDetail(dto.detail),
      causes: (dto.causes ?? []).map(activityMapper.toCause),
    };
  },
};
