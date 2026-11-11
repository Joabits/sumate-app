/**
 * Tipos de la funcionalidad de horas de voluntariado: lo que llega del
 * backend y lo que entrega useHoras().
 */

import type { ApiActionResult } from "@/api/apiResults";

/**
 * pendiente → la organización registró las horas y el voluntario no respondió
 * confirmada → el voluntario las aceptó (solo estas suman y van a la constancia)
 * reclamada → el voluntario no está de acuerdo y escribió el motivo
 */
export type EstadoHoras = "pendiente" | "confirmada" | "reclamada";

export const NOMBRE_ESTADO_HORAS: Record<EstadoHoras, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  reclamada: "Reclamada",
};

export type RegistroHoras = {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  /** Día de la jornada, "AAAA-MM-DD" */
  jornada: string;
  horas: number;
  estado: EstadoHoras;
  motivoReclamo: string | null;
  /** Horas antes de la última corrección */
  horasAnteriores: number | null;
};

export type ParticipanteAceptado = {
  id: string;
  name: string;
  image: string | null;
};

export type HorasActividad = {
  activityId: string;
  esOrganizador: boolean;
  /** La actividad terminó y quien mira es el organizador */
  puedeRegistrar: boolean;
  participantesAceptados: ParticipanteAceptado[];
  registros: RegistroHoras[];
  totalConfirmado: number;
};

export type ActividadConstancia = {
  activityId: string;
  nombre: string;
  organizador: string | null;
  fecha: string;
  jornadas: { jornada: string; horas: number }[];
  totalHoras: number;
};

export type Constancia = {
  voluntario: string;
  correo: string;
  emitida: string;
  actividades: ActividadConstancia[];
  totalHoras: number;
};

// ── Context ───────────────────────────────────────────────────────────────────

/** Lo que entrega useHoras(). Las lecturas lanzan un Error si el backend falla. */
export type HorasContextValue = {
  getHorasDeActividad: (activityId: string) => Promise<HorasActividad>;
  getConstancia: () => Promise<Constancia>;
  registrarJornada: (
    activityId: string,
    jornada: string,
    registros: { userId: string; horas: number }[],
  ) => Promise<ApiActionResult>;
  corregir: (registroId: string, horas: number) => Promise<ApiActionResult>;
  aceptar: (registroId: string) => Promise<ApiActionResult>;
  reclamar: (registroId: string, motivo: string) => Promise<ApiActionResult>;
};
