import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import type { ApiActionResult } from "@/api/apiResults";
import {
  aceptarHorasAction,
  corregirHorasAction,
  reclamarHorasAction,
  registrarJornadaAction,
} from "@/api/horasActions";
import { HorasContext } from "./HorasContext";
import type { HorasContextValue } from "./horasTypes";

/**
 * Reparte las acciones de horas: la organización registra y corrige, el
 * voluntario acepta o reclama. Después de cada una, las secciones abiertas
 * recargan sus datos (refresh de ActivitiesProvider).
 */
export function HorasProvider({ children }: { children: ReactNode }) {
  const { refresh } = useActivities();

  const value = useMemo<HorasContextValue>(() => {
    const thenRefresh =
      <A extends unknown[]>(action: (...args: A) => Promise<ApiActionResult>) =>
      async (...args: A) => {
        const result = await action(...args);
        if (result.ok) refresh();
        return result;
      };

    return {
      registrarJornada: thenRefresh(registrarJornadaAction),
      corregir: thenRefresh(corregirHorasAction),
      aceptar: thenRefresh(aceptarHorasAction),
      reclamar: thenRefresh(reclamarHorasAction),
    };
  }, [refresh]);

  return <HorasContext.Provider value={value}>{children}</HorasContext.Provider>;
}
