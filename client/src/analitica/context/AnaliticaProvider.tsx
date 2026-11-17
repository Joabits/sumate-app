import { useMemo, type ReactNode } from "react";
import { datosOError, type ApiError } from "@/api/apiResults";
import { analiticaApi } from "@/api/analiticaApi";
import { AnaliticaContext } from "./AnaliticaContext";
import type { AnaliticaContextValue as Ctx, MotivoRechazo } from "./analiticaTypes";

/** Códigos de error del backend (app/exceptions.py) que van a otro motivo que el de su estado HTTP. */
const MOTIVO_POR_CODIGO: Record<string, MotivoRechazo> = {
  RETIRO_FUERA_DE_PLAZO: "fuera_de_plazo",
  CANNOT_LEAVE_PAST_ACTIVITY: "fuera_de_plazo",
  CANNOT_JOIN_PAST_ACTIVITY: "fuera_de_plazo",
  ACTIVIDAD_NO_TERMINADA: "fuera_de_plazo",
  ACTIVITY_CAPACITY_EXCEEDED: "sin_cupos",
  ACTIVIDAD_CANCELADA: "actividad_cancelada",
  CUENTA_CON_ACTIVIDADES_POR_TERMINAR: "actividades_por_terminar",
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

/** Sin esperar la respuesta: si falla, la persona sigue con lo que hacía. La fecha la pone el backend. */
const track: Ctx["track"] = (evento, props) => {
  if (import.meta.env.DEV) console.log("[evento]", { evento, props });
  void analiticaApi.registrarEvento(evento, props);
};

const trackRechazo: Ctx["trackRechazo"] = (flujo, error) => {
  const motivo = motivoDeRechazo(error);
  if (motivo) track("accion_rechazada", { flujo, motivo });
};

const getAnalitica: Ctx["getAnalitica"] = async () =>
  datosOError(await analiticaApi.getAnalitica());

/**
 * Analítica de interacción.
 *
 * Cada vez que alguien empieza, avanza o termina un flujo principal se guarda
 * una línea en la tabla eventos del backend y el panel /analitica las cuenta.
 * Se registra la acción, no a la persona: un evento no lleva usuario, correo,
 * nombre, la actividad ni texto escrito por la persona, solo sus propiedades fijas.
 */
export function AnaliticaProvider({ children }: { children: ReactNode }) {
  // Las funciones no dependen de ningún estado: el objeto se crea una sola vez
  const value = useMemo<Ctx>(() => ({ track, trackRechazo, getAnalitica }), []);

  return <AnaliticaContext.Provider value={value}>{children}</AnaliticaContext.Provider>;
}
