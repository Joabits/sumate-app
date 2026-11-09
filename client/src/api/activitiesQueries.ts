/**
 * Lecturas que usan las páginas de actividades. Si el backend falla lanzan un
 * error con el mensaje para mostrar (la página lo atrapa y muestra ErrorView).
 */

import type {
  ActivityDetailData,
  ActivityListItem,
  Cause,
  MyActivityListItem,
} from "@/activities/context/activitiesTypes";
import { activitiesApi } from "./activitiesApi";

export async function getExploreActivitiesQuery(): Promise<ActivityListItem[]> {
  const response = await activitiesApi.listExplore();
  if (!response.ok) {
    throw new Error(response.errors?.[0] ?? "Error al cargar las actividades para explorar.");
  }
  return response.data;
}

export async function getMyActivitiesQuery(): Promise<MyActivityListItem[]> {
  const response = await activitiesApi.listMyActivities();
  if (!response.ok) {
    throw new Error(response.errors?.[0] ?? "Error al cargar mis actividades.");
  }
  return response.data;
}

/** null si la actividad no existe (o es un borrador de otra persona). */
export async function getActivityDetailQuery(id: string): Promise<ActivityDetailData | null> {
  const response = await activitiesApi.getActivityDetail(id);
  if (!response.ok) {
    if (response.statusCode === 404) return null;
    throw new Error(response.errors?.[0] ?? "Error al cargar los detalles de la actividad.");
  }
  return response.data;
}

export async function listCausesQuery(): Promise<Cause[]> {
  const response = await activitiesApi.listCauses();
  if (!response.ok) {
    throw new Error(response.errors?.[0] ?? "Error al cargar el catálogo de causas.");
  }
  return response.data;
}
