import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import type { ApiActionResult } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { participationsApi } from "@/api/participationsApi";
import { ParticipationsContext } from "./ParticipationsContext";
import type { ParticipatedActivityListItem, ParticipationsContextValue } from "./participationsTypes";

/**
 * Lógica de participación: el voluntario solicita o sale, y el organizador
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

      leave: async (activityId: string) => {
        if (!activityId.trim()) return invalidResult("ID de actividad inválido.");
        return conRecarga(participationsApi.leaveActivity(activityId));
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
