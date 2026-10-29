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

async function reviewRequest(
  activityId: string,
  participantId: string,
  decision: "accept" | "reject",
): Promise<ApiActionResult> {
  if (!activityId?.trim() || !participantId?.trim()) {
    return errorResult("Solicitud inválida.");
  }

  const result =
    decision === "accept"
      ? await participationRepositoryImpl.acceptRequest(activityId, participantId)
      : await participationRepositoryImpl.rejectRequest(activityId, participantId);

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

export async function acceptRequestAction(
  activityId: string,
  participantId: string,
): Promise<ApiActionResult> {
  return reviewRequest(activityId, participantId, "accept");
}

export async function rejectRequestAction(
  activityId: string,
  participantId: string,
): Promise<ApiActionResult> {
  return reviewRequest(activityId, participantId, "reject");
}
