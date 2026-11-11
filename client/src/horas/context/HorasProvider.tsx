import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import type { ApiActionResult } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { horasApi } from "@/api/horasApi";
import { HorasContext } from "./HorasContext";
import type { Constancia, HorasActividad, HorasContextValue } from "./horasTypes";

const MENSAJE_HORAS = "Las horas deben ser mayores a 0 y no superar 24 por jornada.";

const horasValidas = (horas: number) => Number.isFinite(horas) && horas > 0 && horas <= 24;

/**
 * Lógica de horas de voluntariado: la organización registra y corrige, el
 * voluntario acepta o reclama. Valida lo básico antes de llamar al backend
 * (que vuelve a validar todas las reglas) y, después de cada acción, las
 * secciones abiertas recargan sus datos (refresh de ActivitiesProvider).
 */
export function HorasProvider({ children }: { children: ReactNode }) {
  const { refresh } = useActivities();

  const value = useMemo<HorasContextValue>(() => {
    const conRecarga = async (llamada: Promise<ApiActionResult>) => {
      const result = await llamada;
      if (result.ok) refresh();
      return result;
    };

    return {
      getHorasDeActividad: async (activityId: string): Promise<HorasActividad> => {
        const response = await horasApi.getHorasDeActividad(activityId);
        if (!response.ok) {
          throw new Error(response.errors?.[0] ?? "Error al cargar las horas de la actividad.");
        }
        return response.data;
      },

      getConstancia: async (): Promise<Constancia> => {
        const response = await horasApi.getConstancia();
        if (!response.ok) throw new Error(response.errors?.[0] ?? "Error al cargar la constancia.");
        return response.data;
      },

      registrarJornada: async (activityId, jornada, registros) => {
        if (!jornada) return invalidResult("Elige la fecha de la jornada.");
        if (registros.length === 0) {
          return invalidResult("Indica las horas de al menos un participante.");
        }
        if (!registros.every((r) => horasValidas(r.horas))) return invalidResult(MENSAJE_HORAS);
        return conRecarga(horasApi.registrarJornada(activityId, jornada, registros));
      },

      corregir: async (registroId, horas) => {
        if (!horasValidas(horas)) return invalidResult(MENSAJE_HORAS);
        return conRecarga(horasApi.corregir(registroId, horas));
      },

      aceptar: (registroId) => conRecarga(horasApi.aceptar(registroId)),

      reclamar: async (registroId, motivo) => {
        if (!motivo.trim()) return invalidResult("Escribe el motivo del reclamo.");
        return conRecarga(horasApi.reclamar(registroId, motivo.trim()));
      },
    };
  }, [refresh]);

  return <HorasContext.Provider value={value}>{children}</HorasContext.Provider>;
}
