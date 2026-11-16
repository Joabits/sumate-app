import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import { datosOError, type ApiActionResult } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { horasApi } from "@/api/horasApi";
import { HorasContext } from "./HorasContext";
import type { HorasContextValue as Ctx } from "./horasTypes";

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

  const value = useMemo<Ctx>(() => {
    /** Espera la llamada y, si salió bien, pide a las páginas que recarguen. */
    const conRecarga = async (llamada: Promise<ApiActionResult>) => {
      const result = await llamada;
      if (result.ok) refresh();
      return result;
    };

    const getHorasDeActividad: Ctx["getHorasDeActividad"] = async (activityId) =>
      datosOError(await horasApi.getHorasDeActividad(activityId));

    const getConstancia: Ctx["getConstancia"] = async () =>
      datosOError(await horasApi.getConstancia());

    const registrarJornada: Ctx["registrarJornada"] = async (activityId, jornada, registros) => {
      if (!jornada) return invalidResult("Elige la fecha de la jornada.");
      if (registros.length === 0) return invalidResult("Indica las horas de al menos un participante.");
      if (!registros.every((r) => horasValidas(r.horas))) return invalidResult(MENSAJE_HORAS);
      return conRecarga(horasApi.registrarJornada(activityId, jornada, registros));
    };

    const corregir: Ctx["corregir"] = async (registroId, horas) => {
      if (!horasValidas(horas)) return invalidResult(MENSAJE_HORAS);
      return conRecarga(horasApi.corregir(registroId, horas));
    };

    const aceptar: Ctx["aceptar"] = (registroId) => conRecarga(horasApi.aceptar(registroId));

    const reclamar: Ctx["reclamar"] = async (registroId, motivo) => {
      if (!motivo.trim()) return invalidResult("Escribe el motivo del reclamo.");
      return conRecarga(horasApi.reclamar(registroId, motivo.trim()));
    };

    return {
      getHorasDeActividad,
      getConstancia,
      registrarJornada,
      corregir,
      aceptar,
      reclamar,
    };
  }, [refresh]);

  return <HorasContext.Provider value={value}>{children}</HorasContext.Provider>;
}
