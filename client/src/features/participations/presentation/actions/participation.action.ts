"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ApiActionResult } from "@/features/shared/domain/types/api-results";
import { errorResult } from "@/features/shared/infrastructure/errors/api-error";
import { participationRepositoryImpl } from "../../infrastructure/repositories/participation.repository";

export async function joinActivityAction(activityId: string): Promise<ApiActionResult> {
  if (!activityId || !activityId.trim()) {
    return errorResult("ID de actividad inválido.");
  }

  const result = await participationRepositoryImpl.joinActivity(activityId);

  if (result.ok) {
    revalidatePath(`/activities/${activityId}`);
    revalidatePath("/explore");
    revalidatePath("/recently");
    updateTag("activities");
    updateTag(`activity-${activityId}`);
    updateTag("participations");
    updateTag("participations-me");
  }

  return result;
}

export async function leaveActivityAction(activityId: string): Promise<ApiActionResult> {
  if (!activityId || !activityId.trim()) {
    return errorResult("ID de actividad inválido.");
  }

  const result = await participationRepositoryImpl.leaveActivity(activityId);

  if (result.ok) {
    revalidatePath(`/activities/${activityId}`);
    revalidatePath("/explore");
    revalidatePath("/recently");
    updateTag("activities");
    updateTag(`activity-${activityId}`);
    updateTag("participations");
    updateTag("participations-me");
  }

  return result;
}

async function revisarSolicitud(
  activityId: string,
  participanteId: string,
  decision: "aceptar" | "rechazar",
): Promise<ApiActionResult> {
  if (!activityId?.trim() || !participanteId?.trim()) {
    return errorResult("Solicitud inválida.");
  }

  const result =
    decision === "aceptar"
      ? await participationRepositoryImpl.aceptarSolicitud(activityId, participanteId)
      : await participationRepositoryImpl.rechazarSolicitud(activityId, participanteId);

  if (result.ok) {
    revalidatePath(`/activities/${activityId}`);
    revalidatePath("/explore");
    revalidatePath("/my-activities");
    updateTag("activities");
    updateTag(`activity-${activityId}`);
    updateTag("participations");
  }

  return result;
}

export async function aceptarSolicitudAction(
  activityId: string,
  participanteId: string,
): Promise<ApiActionResult> {
  return revisarSolicitud(activityId, participanteId, "aceptar");
}

export async function rechazarSolicitudAction(
  activityId: string,
  participanteId: string,
): Promise<ApiActionResult> {
  return revisarSolicitud(activityId, participanteId, "rechazar");
}
