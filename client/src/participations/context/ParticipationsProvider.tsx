import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import type { ApiActionResult } from "@/api/apiResults";
import {
  aceptarSolicitudAction,
  joinActivityAction,
  leaveActivityAction,
  rechazarSolicitudAction,
} from "@/api/participationsActions";
import { ParticipationsContext } from "./ParticipationsContext";
import type { ParticipationsContextValue } from "./participationsTypes";

/**
 * Reparte las acciones de participación: el voluntario solicita o sale, y el
 * organizador acepta o rechaza. Va dentro de ActivitiesProvider y usa su
 * refresh(): después de cada acción las páginas abiertas recargan sus datos.
 */
export function ParticipationsProvider({ children }: { children: ReactNode }) {
  const { refresh } = useActivities();

  const value = useMemo<ParticipationsContextValue>(() => {
    const thenRefresh =
      <A extends unknown[]>(action: (...args: A) => Promise<ApiActionResult>) =>
      async (...args: A) => {
        const result = await action(...args);
        if (result.ok) refresh();
        return result;
      };

    return {
      join: thenRefresh(joinActivityAction),
      leave: thenRefresh(leaveActivityAction),
      aceptarSolicitud: thenRefresh(aceptarSolicitudAction),
      rechazarSolicitud: thenRefresh(rechazarSolicitudAction),
    };
  }, [refresh]);

  return (
    <ParticipationsContext.Provider value={value}>{children}</ParticipationsContext.Provider>
  );
}
