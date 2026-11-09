/**
 * Tipos de la funcionalidad de actividades: los datos que llegan del backend
 * y lo que entregan los Context (useActivities y useActivityDetail).
 */

import type { ApiActionResult } from "@/api/apiResults";

/** cancelled: la organización la canceló con un motivo y ya no admite cambios. */
export type ActivityStatus = "draft" | "active" | "closed" | "cancelled";

export type Cause = {
  id: string;
  name: string;
  slug: string;
};

export type Activity = {
  id: string;
  name: string;
  ownerId: string;
  imageUrl: string;
  date: string; // Formato ISO 8601 string
  capacity: number;
  status: ActivityStatus;
  creatorName?: string;
  creatorImage?: string;
};

export type ActivityListItem = Pick<
  Activity,
  | "id"
  | "name"
  | "imageUrl"
  | "date"
  | "ownerId"
  | "capacity"
  | "status"
  | "creatorName"
  | "creatorImage"
> & {
  causes?: Cause[];
  registeredCount?: number;
};

export type MyActivityListItem = ActivityListItem & {
  registeredCount: number;
};

export type ActivityDetail = {
  id: string;
  activityId: string;
  latitude: number | null;
  longitude: number | null;
  place: string | null;
  address: string | null;
  description: string | null;
};

export type EstadoSolicitud =
  | "pendiente"
  | "aceptada"
  | "rechazada"
  | "en_espera"
  | "cancelada";

/** Cómo se muestra cada estado de una solicitud en pantalla. */
export const NOMBRE_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  en_espera: "En lista de espera",
  cancelada: "Cancelada por la organización",
};

export type ActivityParticipant = {
  id: string;
  name: string;
  image: string | null;
  /** Solo en postulantes cancelados: el estado que tenían antes de la cancelación. */
  estadoAnterior?: EstadoSolicitud | null;
};

export type ActivityDetailData = Activity & {
  isOwner: boolean;
  isParticipating?: boolean;
  /** Estado de la solicitud del usuario actual (null si no ha solicitado). */
  estadoSolicitud: EstadoSolicitud | null;
  participants: ActivityParticipant[];
  /** Solicitudes pendientes de revisión (solo llegan al organizador). */
  solicitudesPendientes: ActivityParticipant[];
  /** Puesto del usuario actual en la lista de espera (1 = el próximo en entrar). */
  posicionEnEspera: number | null;
  /** Lista de espera en orden de llegada (solo llega al organizador). */
  listaDeEspera: ActivityParticipant[];
  /** Motivo con el que la organización canceló la actividad. */
  motivoCancelacion: string | null;
  /** Postulantes afectados por la cancelación, con su estado anterior (solo organizador). */
  postulantesCancelados: ActivityParticipant[];
  detail: ActivityDetail | null;
  causes: Cause[];
};

export type ActivityScope = "mine" | "others";

export type TimeOfDayFilter =
  | "any"
  | "early_morning"
  | "morning"
  | "afternoon"
  | "night";

export type DatePresetFilter =
  | "upcoming"
  | "starting_soon"
  | "today"
  | "tomorrow"
  | "this_weekend"
  | "next_week"
  | "next_weekend";

export type CapacityRangeFilter =
  | "any"
  | "1-9"
  | "10-20"
  | "gt-20";

export interface SearchFilterState {
  timeOfDay: TimeOfDayFilter;
  datePreset: DatePresetFilter;
  capacityRange: CapacityRangeFilter;
  causeIds: string[];
  distanceKm: number;
}

export interface ActivitySearchParams {
  q?: string;
  timeOfDay?: TimeOfDayFilter;
  datePreset?: DatePresetFilter;
  capacityRange?: CapacityRangeFilter;
  causeIds?: string[];
  userLat?: number;
  userLon?: number;
  maxDistanceKm?: number;
}


// ── Context ───────────────────────────────────────────────────────────────────

/** Respuesta de cualquier acción: { ok: true } o el error con sus mensajes. */
export type ActionResult = ApiActionResult;

/** Lo que entrega useActivities(): el catálogo de causas y las acciones sobre actividades. */
export type ActivitiesContextValue = {
  causes: Cause[];
  isLoadingCauses: boolean;
  /** Sube cada vez que una acción cambia datos: las páginas lo usan para recargar */
  dataVersion: number;
  /** Pide a las páginas abiertas que vuelvan a cargar sus datos */
  refresh: () => void;
  createActivity: (formData: FormData) => Promise<ActionResult>;
  updateInfo: (id: string, data: { name?: string; date?: string }) => Promise<ActionResult>;
  updateCapacity: (id: string, capacity: number) => Promise<ActionResult>;
  updateDescription: (id: string, description: string) => Promise<ActionResult>;
  updateImage: (id: string, formData: FormData) => Promise<ActionResult>;
  updateLocation: (id: string, latitude: number, longitude: number, place?: string) => Promise<ActionResult>;
  replaceCauses: (id: string, causeIds: string[]) => Promise<ActionResult>;
  publish: (id: string) => Promise<ActionResult>;
  close: (id: string) => Promise<ActionResult>;
  reopen: (id: string) => Promise<ActionResult>;
  cancelar: (id: string, motivo: string) => Promise<ActionResult>;
  deleteActivity: (id: string) => Promise<ActionResult>;
};

/** Partes de la actividad que el organizador puede editar en el detalle. */
export type EditableField =
  | "image"
  | "title"
  | "date"
  | "capacity"
  | "location"
  | "description"
  | "causes";

/** Lo que entrega useActivityDetail(): la actividad abierta y el modo edición. */
export type ActivityDetailContextValue = {
  activity: ActivityDetailData;
  isEditMode: boolean;
  activeField: EditableField | null;
  isLocationSheetOpen: boolean;
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;
  setActiveField: (field: EditableField | null) => void;
  openLocationSheet: () => void;
  closeLocationSheet: () => void;
};
