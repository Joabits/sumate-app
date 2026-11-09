/**
 * Acciones que cambian datos (las usan los Providers). Validan lo básico
 * antes de llamar al backend; después el Provider vuelve a cargar los datos.
 */
import type { ApiActionResult } from "./apiResults";
import { errorResult } from "@/api/errors/apiError";
import { activitiesApi } from "./activitiesApi";

export async function createActivityAction(formData: FormData): Promise<ApiActionResult> {
  const name = formData.get("name");
  const date = formData.get("date");
  const capacityRaw = formData.get("capacity");
  const image = formData.get("image");

  if (!name || typeof name !== "string" || !name.trim()) {
    return errorResult("El nombre de la actividad es requerido.");
  }

  if (!date || typeof date !== "string" || !date.trim()) {
    return errorResult("La fecha de la actividad es obligatoria.");
  }

  const capacity = Number(capacityRaw);
  if (!capacityRaw || isNaN(capacity) || !Number.isInteger(capacity) || capacity <= 0) {
    return errorResult("La cantidad de plazas debe ser un número entero mayor a cero.");
  }

  if (capacity > 10000) {
    return errorResult("La cantidad de plazas no puede superar 10,000.");
  }

  if (!image || !(image instanceof File) || image.size === 0) {
    return errorResult("Debes seleccionar una imagen para la actividad.");
  }

  const result = await activitiesApi.createActivity(formData);


  return result;
}

export async function updateActivityLocationAction(
  id: string,
  latitude: number,
  longitude: number,
  place?: string
): Promise<ApiActionResult> {
  if (isNaN(latitude) || isNaN(longitude)) {
    return errorResult("Coordenadas geográficas inválidas.");
  }

  const result = await activitiesApi.updateLocation(id, {
    latitude,
    longitude,
    ...(place?.trim() ? { place: place.trim() } : {}),
  });


  return result;
}

export async function updateActivityDescriptionAction(
  id: string,
  description: string
): Promise<ApiActionResult> {
  if (!description || !description.trim()) {
    return errorResult("La descripción no puede estar vacía.");
  }

  const result = await activitiesApi.updateDescription(id, {
    description: description.trim(),
  });


  return result;
}

export async function updateActivityImageAction(
  id: string,
  formData: FormData
): Promise<ApiActionResult> {
  const image = formData.get("image");
  if (!image || !(image instanceof File) || image.size === 0) {
    return errorResult("Debes seleccionar una imagen válida.");
  }

  const result = await activitiesApi.updateImage(id, formData);


  return result;
}

export async function updateActivityInfoAction(
  id: string,
  data: { name?: string; date?: string }
): Promise<ApiActionResult> {
  const result = await activitiesApi.updateInfo(id, data);


  return result;
}

export async function updateActivityCapacityAction(
  id: string,
  capacity: number
): Promise<ApiActionResult> {
  if (isNaN(capacity) || !Number.isInteger(capacity) || capacity <= 0) {
    return errorResult("La cantidad de plazas debe ser un número entero mayor a cero.");
  }

  if (capacity > 10000) {
    return errorResult("La cantidad de plazas no puede superar 10,000.");
  }

  const result = await activitiesApi.updateCapacity(id, { capacity });


  return result;
}

export async function publishActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activitiesApi.publishActivity(id);


  return result;
}

export async function closeActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activitiesApi.closeActivity(id);


  return result;
}

export async function reopenActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activitiesApi.reopenActivity(id);


  return result;
}

export async function cancelarActividadAction(
  id: string,
  motivo: string,
): Promise<ApiActionResult> {
  if (!motivo.trim()) {
    return errorResult("Escribe el motivo de la cancelación.");
  }

  const result = await activitiesApi.cancelarActividad(id, motivo.trim());


  return result;
}

export async function deleteActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activitiesApi.deleteActivity(id);


  return result;
}

export async function replaceActivityCausesAction(
  id: string,
  causeIds: string[]
): Promise<ApiActionResult> {
  const result = await activitiesApi.replaceActivityCauses(id, causeIds);


  return result;
}


