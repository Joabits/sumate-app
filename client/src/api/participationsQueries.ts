/** Lecturas que usan las páginas de participaciones. */

import type { ParticipatedActivityListItem } from "@/participations/context/participationsTypes";
import { participationsApi } from "./participationsApi";

export async function getMyParticipationsQuery(): Promise<ParticipatedActivityListItem[]> {
  const response = await participationsApi.listMyParticipations();
  if (!response.ok) {
    throw new Error(
      response.errors?.[0] ?? "Error al cargar el historial de participaciones.",
    );
  }
  return response.data;
}
