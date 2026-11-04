"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ApiActionResult } from "@/features/shared/domain/types/api-results";
import { errorResult } from "@/features/shared/infrastructure/errors/api-error";
import { activityRepositoryImpl } from "../../infrastructure/repositories/activity.repository";

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

  const result = await activityRepositoryImpl.createActivity(formData);

  if (result.ok) {
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
  }

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

  const result = await activityRepositoryImpl.updateLocation(id, {
    latitude,
    longitude,
    ...(place?.trim() ? { place: place.trim() } : {}),
  });

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function updateActivityDescriptionAction(
  id: string,
  description: string
): Promise<ApiActionResult> {
  if (!description || !description.trim()) {
    return errorResult("La descripción no puede estar vacía.");
  }

  const result = await activityRepositoryImpl.updateDescription(id, {
    description: description.trim(),
  });

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

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

  const result = await activityRepositoryImpl.updateImage(id, formData);

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function updateActivityInfoAction(
  id: string,
  data: { name?: string; date?: string }
): Promise<ApiActionResult> {
  const result = await activityRepositoryImpl.updateInfo(id, data);

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

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

  const result = await activityRepositoryImpl.updateCapacity(id, { capacity });

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function publishActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activityRepositoryImpl.publishActivity(id);

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function closeActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activityRepositoryImpl.closeActivity(id);

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function reopenActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activityRepositoryImpl.reopenActivity(id);

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function cancelarActividadAction(
  id: string,
  motivo: string,
): Promise<ApiActionResult> {
  if (!motivo.trim()) {
    return errorResult("Escribe el motivo de la cancelación.");
  }

  const result = await activityRepositoryImpl.cancelarActividad(id, motivo.trim());

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    revalidatePath("/recently");
    updateTag("activities");
    updateTag(`activity-${id}`);
    updateTag("participations");
    updateTag("participations-me");
  }

  return result;
}

export async function deleteActivityAction(id: string): Promise<ApiActionResult> {
  const result = await activityRepositoryImpl.deleteActivity(id);

  if (result.ok) {
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}

export async function replaceActivityCausesAction(
  id: string,
  causeIds: string[]
): Promise<ApiActionResult> {
  const result = await activityRepositoryImpl.replaceActivityCauses(id, causeIds);

  if (result.ok) {
    revalidatePath(`/activities/${id}`);
    revalidatePath("/my-activities");
    revalidatePath("/explore");
    revalidatePath("/recently");
    updateTag("activities");
    updateTag(`activity-${id}`);
  }

  return result;
}


