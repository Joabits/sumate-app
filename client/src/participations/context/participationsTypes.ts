/**
 * Tipos de la funcionalidad de participaciones: Mi trayectoria y lo que
 * entrega useParticipations().
 */

import type { ApiActionResult } from "@/api/apiResults";

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

// ── Context ───────────────────────────────────────────────────────────────────

/** Lo que entrega useParticipations(): mis solicitudes, solicitar, salir y revisar. */
export type ParticipationsContextValue = {
  /** Lanza un Error con el mensaje para mostrar si el backend falla */
  getMyParticipations: () => Promise<ParticipatedActivityListItem[]>;
  join: (activityId: string) => Promise<ApiActionResult>;
  leave: (activityId: string) => Promise<ApiActionResult>;
  aceptarSolicitud: (activityId: string, participanteId: string) => Promise<ApiActionResult>;
  rechazarSolicitud: (activityId: string, participanteId: string) => Promise<ApiActionResult>;
};
