/**
 * Llamadas HTTP al backend para actividades. Solo hace la petición: las validaciones y reglas están en ActivitiesProvider.
 */

import type {
  ApiActionResult,
  ApiResult,
} from "./apiResults";
import {
  apiRequestData,
  apiRequestStatus,
} from "./http";
import type {
  ActivityDetailData,
  ActivityListItem,
  ActivitySearchParams,
  Cause,
  MyActivityListItem,
} from "@/activities/context/activitiesTypes";

/** Nombre de cada filtro en la query de GET /activities/search */
const SEARCH_KEYS: Record<keyof ActivitySearchParams, string> = {
  q: "q",
  timeOfDay: "time_of_day",
  datePreset: "date_preset",
  capacityRange: "capacity_range",
  causeIds: "cause_ids",
  userLat: "user_lat",
  userLon: "user_lon",
  maxDistanceKm: "max_distance_km",
};

/** Filtros de la app → query string. Los que vienen undefined no se mandan. */
function toSearchQuery(params: ActivitySearchParams): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const item of [value].flat()) {
      query.append(SEARCH_KEYS[key as keyof ActivitySearchParams], String(item));
    }
  }
  return query;
}

const BASE_URL = `${import.meta.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"}/activities`;

export const activitiesApi = {
  async listExplore(): Promise<ApiResult<ActivityListItem[]>> {
    return apiRequestData({
      url: `${BASE_URL}/explore`,
      method: "GET",
      mapData: (json: { items: ActivityListItem[] }) => json.items,
      fallbackMessage: "Error al cargar las actividades para explorar.",
    });
  },

  async searchActivities(params: ActivitySearchParams): Promise<ApiResult<ActivityListItem[]>> {
    return apiRequestData({
      url: `${BASE_URL}/search?${toSearchQuery(params)}`,
      method: "GET",
      mapData: (json: { items: ActivityListItem[] }) => json.items,
      fallbackMessage: "Error al realizar la búsqueda de actividades.",
    });
  },

  async listMyActivities(): Promise<ApiResult<MyActivityListItem[]>> {
    return apiRequestData({
      url: `${BASE_URL}/my-activities`,
      method: "GET",
      mapData: (json: { items: MyActivityListItem[] }) => json.items,
      fallbackMessage: "Error al cargar mis actividades.",
    });
  },

  async getActivityDetail(id: string): Promise<ApiResult<ActivityDetailData>> {
    return apiRequestData({
      url: `${BASE_URL}/${id}`,
      method: "GET",
      fallbackMessage: "Error al cargar el detalle de la actividad.",
    });
  },

  async listCauses(): Promise<ApiResult<Cause[]>> {
    return apiRequestData({
      url: `${BASE_URL}/causes`,
      method: "GET",
      mapData: (json: { items: Cause[] }) => json.items,
      fallbackMessage: "Error al cargar el catálogo de causas.",
    });
  },

  async replaceActivityCauses(
    id: string,
    causeIds: string[]
  ): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/causes`,
      method: "PUT",
      body: { cause_ids: causeIds },
      fallbackMessage: "Error al actualizar las causas de la actividad.",
    });
  },

  async createActivity(data: {
    name: string;
    /** Fecha en ISO 8601 (UTC) */
    date: string;
    capacity: number;
    image: File;
  }): Promise<ApiActionResult> {
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("date", data.date);
    formData.set("capacity", String(data.capacity));
    formData.set("image", data.image);
    return apiRequestStatus({
      url: BASE_URL,
      method: "POST",
      body: formData,
      fallbackMessage: "Error al registrar la actividad.",
    });
  },

  async updateLocation(
    id: string,
    data: { latitude: number; longitude: number; place?: string }
  ): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/location`,
      method: "PATCH",
      body: data,
      fallbackMessage: "Error al actualizar la ubicación.",
    });
  },

  async updateDescription(
    id: string,
    data: { description: string }
  ): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/description`,
      method: "PATCH",
      body: data,
      fallbackMessage: "Error al actualizar la descripción.",
    });
  },

  async updateImage(id: string, image: File): Promise<ApiActionResult> {
    const formData = new FormData();
    formData.set("image", image);
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/image`,
      method: "PATCH",
      body: formData,
      fallbackMessage: "Error al actualizar la foto de portada.",
    });
  },

  async updateInfo(
    id: string,
    data: { name?: string; date?: string }
  ): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/info`,
      method: "PATCH",
      body: data,
      fallbackMessage: "Error al actualizar los datos base de la actividad.",
    });
  },

  async updateCapacity(
    id: string,
    data: { capacity: number }
  ): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/capacity`,
      method: "PATCH",
      body: data,
      fallbackMessage: "Error al actualizar los cupos de la actividad.",
    });
  },

  async publishActivity(id: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/publish`,
      method: "POST",
      fallbackMessage: "Error al publicar la actividad.",
    });
  },

  async closeActivity(id: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/close`,
      method: "POST",
      fallbackMessage: "Error al cerrar la convocatoria de la actividad.",
    });
  },

  async cancelarActividad(id: string, motivo: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/cancelar`,
      method: "POST",
      body: { motivo },
      fallbackMessage: "Error al cancelar la actividad.",
    });
  },

  async reopenActivity(id: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}/reopen`,
      method: "POST",
      fallbackMessage: "Error al reabrir la convocatoria de la actividad.",
    });
  },

  async deleteActivity(id: string): Promise<ApiActionResult> {
    return apiRequestStatus({
      url: `${BASE_URL}/${id}`,
      method: "DELETE",
      fallbackMessage: "Error al eliminar la actividad.",
    });
  },
};

