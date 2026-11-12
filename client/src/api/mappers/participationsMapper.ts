/**
 * Lo que responde el backend en /participaciones/me y su conversión a los
 * tipos de la app. Solo transforma datos.
 */

import type { EstadoSolicitud } from "@/activities/context/activitiesTypes";
import type { ParticipatedActivityListItem, Retiro } from "@/participations/context/participationsTypes";
import { activityMapper, type CauseResponse } from "./activitiesMapper";

export type ParticipatedActivityItemResponse = {
  id: string;
  name: string;
  image_url: string;
  date: string;
  owner_id: string;
  capacity: number;
  status: string;
  enrolled_date: string;
  is_past: boolean;
  estado_solicitud?: EstadoSolicitud;
  motivo_cancelacion?: string | null;
  estado_anterior?: EstadoSolicitud | null;
  creator_name?: string | null;
  creator_image?: string | null;
  causes?: CauseResponse[];
};

export type ParticipatedActivityListResponse = { items: ParticipatedActivityItemResponse[] };

/** Respuesta de POST /participaciones/{id}/retiro */
export type RetiroResponse = {
  estado_anterior: Retiro["estadoAnterior"];
  entro_de_lista_de_espera: boolean;
};

export const participationMapper = {
  toRetiro(dto: RetiroResponse): Retiro {
    return {
      estadoAnterior: dto.estado_anterior,
      entroDeListaDeEspera: dto.entro_de_lista_de_espera,
    };
  },

  toParticipatedActivityItem(dto: ParticipatedActivityItemResponse): ParticipatedActivityListItem {
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
      estadoSolicitud: dto.estado_solicitud ?? "aceptada",
      motivoCancelacion: dto.motivo_cancelacion ?? null,
      estadoAnterior: dto.estado_anterior ?? null,
      creatorName: dto.creator_name ?? undefined,
      creatorImage: dto.creator_image ?? undefined,
      causes: (dto.causes ?? []).map(activityMapper.toCause),
    };
  },

  toParticipatedActivityList(dto: ParticipatedActivityListResponse): ParticipatedActivityListItem[] {
    return dto.items.map(participationMapper.toParticipatedActivityItem);
  },
};
