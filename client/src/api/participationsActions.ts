/**
 * Acciones que cambian datos (las usan los Providers). Validan lo básico
 * antes de llamar al backend; después el Provider vuelve a cargar los datos.
 */
import type { ApiActionResult } from "./apiResults";
import { errorResult } from "@/api/errors/apiError";
import { participationsApi } from "./participationsApi";

export async function joinActivityAction(activityId: string): Promise<ApiActionResult> {
  if (!activityId || !activityId.trim()) {
    return errorResult("ID de actividad inválido.");
  }

  const result = await participationsApi.joinActivity(activityId);


  return result;
}

export async function leaveActivityAction(activityId: string): Promise<ApiActionResult> {
  if (!activityId || !activityId.trim()) {
    return errorResult("ID de actividad inválido.");
  }

  const result = await participationsApi.leaveActivity(activityId);


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
      ? await participationsApi.aceptarSolicitud(activityId, participanteId)
      : await participationsApi.rechazarSolicitud(activityId, participanteId);


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
