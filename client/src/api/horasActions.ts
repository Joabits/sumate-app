/**
 * Acciones sobre horas (las usa HorasProvider). Validan lo básico antes de
 * llamar al backend; el backend vuelve a validar todas las reglas.
 */

import type { ApiActionResult } from "./apiResults";
import { errorResult } from "./errors/apiError";
import { horasApi } from "./horasApi";

const horasValidas = (horas: number) => Number.isFinite(horas) && horas > 0 && horas <= 24;

export async function registrarJornadaAction(
  activityId: string,
  jornada: string,
  registros: { userId: string; horas: number }[],
): Promise<ApiActionResult> {
  if (!jornada) return errorResult("Elige la fecha de la jornada.");
  if (registros.length === 0) return errorResult("Indica las horas de al menos un participante.");
  if (!registros.every((r) => horasValidas(r.horas))) {
    return errorResult("Las horas deben ser mayores a 0 y no superar 24 por jornada.");
  }
  return horasApi.registrarJornada(activityId, jornada, registros);
}

export async function corregirHorasAction(registroId: string, horas: number): Promise<ApiActionResult> {
  if (!horasValidas(horas)) {
    return errorResult("Las horas deben ser mayores a 0 y no superar 24 por jornada.");
  }
  return horasApi.corregir(registroId, horas);
}

export async function aceptarHorasAction(registroId: string): Promise<ApiActionResult> {
  return horasApi.aceptar(registroId);
}

export async function reclamarHorasAction(registroId: string, motivo: string): Promise<ApiActionResult> {
  if (!motivo.trim()) return errorResult("Escribe el motivo del reclamo.");
  return horasApi.reclamar(registroId, motivo.trim());
}
