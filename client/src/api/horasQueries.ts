/** Lecturas de horas que usan las páginas y secciones. */

import type { Constancia, HorasActividad } from "@/horas/context/horasTypes";
import { horasApi } from "./horasApi";

export async function getHorasDeActividadQuery(activityId: string): Promise<HorasActividad> {
  const response = await horasApi.getHorasDeActividad(activityId);
  if (!response.ok) {
    throw new Error(response.errors?.[0] ?? "Error al cargar las horas de la actividad.");
  }
  return response.data;
}

export async function getConstanciaQuery(): Promise<Constancia> {
  const response = await horasApi.getConstancia();
  if (!response.ok) {
    throw new Error(response.errors?.[0] ?? "Error al cargar la constancia.");
  }
  return response.data;
}
