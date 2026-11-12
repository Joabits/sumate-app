import { useMemo, type ReactNode } from "react";
import type { ApiError } from "@/api/apiResults";
import { analiticaApi } from "@/api/analiticaApi";
import { AnaliticaContext } from "./AnaliticaContext";
import type { Analitica, AnaliticaContextValue, MotivoRechazo } from "./analiticaTypes";

/** Códigos de error del backend (app/exceptions.py) que van a otro motivo que el de su estado HTTP. */
const MOTIVO_POR_CODIGO: Record<string, MotivoRechazo> = {
  RETIRO_FUERA_DE_PLAZO: "fuera_de_plazo",
  CANNOT_LEAVE_PAST_ACTIVITY: "fuera_de_plazo",
  CANNOT_JOIN_PAST_ACTIVITY: "fuera_de_plazo",
  ACTIVIDAD_NO_TERMINADA: "fuera_de_plazo",
  ACTIVITY_CAPACITY_EXCEEDED: "sin_cupos",
  ACTIVIDAD_CANCELADA: "actividad_cancelada",
};

/**
 * Convierte un error en un motivo de la lista fija. null = no frenó la tarea
 * por una regla (red caída, sesión vencida, error del servidor): no se registra.
 */
function motivoDeRechazo(error: ApiError): MotivoRechazo | null {
  if (error.code && MOTIVO_POR_CODIGO[error.code]) return MOTIVO_POR_CODIGO[error.code];
  if (error.statusCode === 403) return "sin_permiso";
  if (error.statusCode === 400 || error.statusCode === 422) return "validacion";
  if (error.statusCode === 409) return "conflicto";
  return null;
}

/**
 * Analítica de interacción.
 *
 * Cada vez que alguien empieza, avanza o termina un flujo principal se guarda
 * una línea en la tabla eventos del backend y el panel /analitica las cuenta.
 * Se registra la acción, no a la persona: un evento no lleva usuario, correo,
 * nombre, la actividad ni texto escrito por la persona, solo sus propiedades fijas.
 */
export function AnaliticaProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AnaliticaContextValue>(() => {
    const track: AnaliticaContextValue["track"] = (evento, props) => {
      // Sin esperar la respuesta: si falla, la persona sigue con lo que hacía.
      // La fecha la pone el backend al guardarlo.
      if (import.meta.env.DEV) {
        console.log("[evento]", { evento, props });
      }
      void analiticaApi.registrarEvento(evento, props);
    };

    return {
      track,

      trackRechazo: (flujo, error) => {
        const motivo = motivoDeRechazo(error);
        if (motivo) track("accion_rechazada", { flujo, motivo });
      },

      getAnalitica: async (): Promise<Analitica> => {
        const response = await analiticaApi.getAnalitica();
        if (!response.ok) throw new Error(response.errors?.[0] ?? "Error al cargar la analítica.");
        return response.data;
      },
    };
  }, []);

  return <AnaliticaContext.Provider value={value}>{children}</AnaliticaContext.Provider>;
}
