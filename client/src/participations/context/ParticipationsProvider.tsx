import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import type { ApiActionResult, ApiError } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { participationsApi } from "@/api/participationsApi";
import { ParticipationsContext } from "./ParticipationsContext";
import {
  MOTIVO_RETIRO_MAX,
  PLAZO_RETIRO_MS,
  type ParticipatedActivityListItem,
  type ParticipationsContextValue,
} from "./participationsTypes";

/** Un aceptado ya no puede retirarse si faltan menos de 24 horas. */
function retiroFueraDePlazo(fechaActividad: string, ahora = Date.now()): boolean {
  return new Date(fechaActividad).getTime() - ahora < PLAZO_RETIRO_MS;
}

/** Mismo código que responde el backend, para tratar los dos casos igual. */
function fueraDePlazoResult(): ApiError {
  return {
    ok: false,
    statusCode: 409,
    code: "RETIRO_FUERA_DE_PLAZO",
    errors: [
      "Ya no puedes retirarte: faltan menos de 24 horas para la actividad. Avisa directamente a la organización.",
    ],
  };
}

/**
 * Lógica de participación: el voluntario solicita o se retira, y el organizador
 * acepta o rechaza. Va dentro de ActivitiesProvider y usa su refresh():
 * después de cada acción las páginas abiertas recargan sus datos.
 */
export function ParticipationsProvider({ children }: { children: ReactNode }) {
  const { refresh } = useActivities();

  const value = useMemo<ParticipationsContextValue>(() => {
    const conRecarga = async (llamada: Promise<ApiActionResult>) => {
      const result = await llamada;
      if (result.ok) refresh();
      return result;
    };

    return {
      getMyParticipations: async (): Promise<ParticipatedActivityListItem[]> => {
        const response = await participationsApi.listMyParticipations();
        if (!response.ok) {
          throw new Error(
            response.errors?.[0] ?? "Error al cargar el historial de participaciones.",
          );
        }
        return response.data;
      },

      join: async (activityId: string) => {
        if (!activityId.trim()) return invalidResult("ID de actividad inválido.");
        return conRecarga(participationsApi.joinActivity(activityId));
      },

      retiroFueraDePlazo,

      retirarse: async (activityId, { estado, fechaActividad, motivo }) => {
        if (!activityId.trim()) return invalidResult("ID de actividad inválido.");
        let motivoLimpio: string | null = null;
        if (estado === "aceptada") {
          // El backend vuelve a revisar el plazo con su reloj
          if (retiroFueraDePlazo(fechaActividad)) return fueraDePlazoResult();
          motivoLimpio = motivo?.trim() ?? "";
          if (!motivoLimpio) return invalidResult("Escribe el motivo por el que te retiras.");
          if (motivoLimpio.length > MOTIVO_RETIRO_MAX) {
            return invalidResult(`El motivo puede tener hasta ${MOTIVO_RETIRO_MAX} caracteres.`);
          }
        }
        const result = await participationsApi.retirarse(activityId, motivoLimpio);
        if (result.ok) refresh();
        return result;
      },

      aceptarSolicitud: async (activityId: string, participanteId: string) => {
        if (!activityId.trim() || !participanteId.trim()) return invalidResult("Solicitud inválida.");
        return conRecarga(participationsApi.aceptarSolicitud(activityId, participanteId));
      },

      rechazarSolicitud: async (activityId: string, participanteId: string) => {
        if (!activityId.trim() || !participanteId.trim()) return invalidResult("Solicitud inválida.");
        return conRecarga(participationsApi.rechazarSolicitud(activityId, participanteId));
      },
    };
  }, [refresh]);

  return (
    <ParticipationsContext.Provider value={value}>{children}</ParticipationsContext.Provider>
  );
}
