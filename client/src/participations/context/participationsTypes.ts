/**
 * Tipos de la funcionalidad de participaciones: Mi trayectoria y lo que
 * entrega useParticipations().
 */

import type { ApiActionResult, ApiResult } from "@/api/apiResults";

import type {
  Cause,
  EstadoSolicitud,
} from "@/activities/context/activitiesTypes";

export type Participation = {
  id: string;
  activityId: string;
  userId: string;
  createdAt: string;
};

export type ParticipatedActivityListItem = {
  id: string;
  name: string;
  imageUrl: string;
  date: string;
  ownerId: string;
  capacity: number;
  status: string;
  enrolledDate: string;
  isPast: boolean;
  estadoSolicitud: EstadoSolicitud;
  /** Si la organización canceló la actividad: su motivo. */
  motivoCancelacion: string | null;
  /** Si la organización canceló la actividad: el estado que tenía la solicitud. */
  estadoAnterior: EstadoSolicitud | null;
  creatorName?: string;
  creatorImage?: string;
  causes?: Cause[];
};

export type ParticipationFilter = "all" | "upcoming" | "past";

/** Solicitudes que se pueden retirar. */
export type EstadoRetirable = "pendiente" | "aceptada" | "en_espera";

/** Cómo terminó un retiro. */
export type Retiro = {
  /** Lo que era la solicitud antes de retirarse */
  estadoAnterior: EstadoRetirable;
  /** Al liberar el cupo entró la primera persona de la lista de espera */
  entroDeListaDeEspera: boolean;
};

/** Un aceptado puede retirarse hasta 24 horas antes de la actividad. */
export const PLAZO_RETIRO_MS = 24 * 60 * 60 * 1000;
export const MOTIVO_RETIRO_MAX = 500;

// ── Context ───────────────────────────────────────────────────────────────────

/** Lo que entrega useParticipations(): mis solicitudes, solicitar, salir y revisar. */
export type ParticipationsContextValue = {
  /** Lanza un Error con el mensaje para mostrar si el backend falla */
  getMyParticipations: () => Promise<ParticipatedActivityListItem[]>;
  join: (activityId: string) => Promise<ApiActionResult>;
  /** Sin datos: true si el aceptado ya no puede retirarse (faltan menos de 24 h) */
  retiroFueraDePlazo: (fechaActividad: string, ahora?: number) => boolean;
  /** Retirarse: un aceptado con motivo y a tiempo; un pendiente o en espera sin motivo */
  retirarse: (
    activityId: string,
    datos: { estado: EstadoRetirable; fechaActividad: string; motivo?: string },
  ) => Promise<ApiResult<Retiro>>;
  aceptarSolicitud: (activityId: string, participanteId: string) => Promise<ApiActionResult>;
  rechazarSolicitud: (activityId: string, participanteId: string) => Promise<ApiActionResult>;
};
