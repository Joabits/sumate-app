import { useMemo, type ReactNode } from "react";
import { datosOError } from "@/api/apiResults";
import { analiticaApi } from "@/api/analiticaApi";
import { cuentaApi } from "@/api/cuentaApi";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import { useAuth } from "@/auth/hooks/useAuth";
import { CuentaContext } from "./CuentaContext";
import type { CuentaContextValue as Ctx } from "./cuentaTypes";

/**
 * Mis datos y eliminar la cuenta (Tarea 10).
 *
 * La regla de la app (organiza actividades que no terminaron → no se elimina)
 * la decide el backend; aquí se muestra antes de intentar y se registran los
 * eventos de inicio, bloqueo y éxito, sin datos de la persona.
 */
export function CuentaProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { track, trackRechazo } = useAnalitica();

  const value = useMemo<Ctx>(() => {
    const getMisDatos: Ctx["getMisDatos"] = async () => datosOError(await cuentaApi.getMisDatos());

    const descargarMisDatos: Ctx["descargarMisDatos"] = (datos) => {
      // El archivo lleva lo que la app guarda; la regla de eliminación no es un dato de la persona
      const { actividadesPorTerminar: _, ...archivo } = datos;
      const contenido = JSON.stringify(
        { descargadoEl: new Date().toISOString(), ...archivo },
        null,
        2,
      );
      const url = URL.createObjectURL(new Blob([contenido], { type: "application/json" }));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "mis-datos-sumate.json";
      enlace.click();
      URL.revokeObjectURL(url);
      track("mis_datos_descargados", {});
    };

    const iniciarEliminacion: Ctx["iniciarEliminacion"] = (datos) => {
      track("eliminacion_cuenta_iniciada", {});
      // La regla bloquea: se explica en la confirmación y se cuenta el bloqueo
      if (datos.actividadesPorTerminar.length > 0) {
        track("accion_rechazada", { flujo: "eliminar_cuenta", motivo: "actividades_por_terminar" });
      }
    };

    const eliminarCuenta: Ctx["eliminarCuenta"] = async () => {
      const result = await cuentaApi.eliminarCuenta();
      if (!result.ok) {
        trackRechazo("eliminar_cuenta", result);
        return result;
      }
      // Se espera el evento antes de cerrar la sesión: después ya no hay token para mandarlo
      await analiticaApi.registrarEvento("cuenta_eliminada", {});
      await logout();
      return result;
    };

    return { getMisDatos, descargarMisDatos, iniciarEliminacion, eliminarCuenta };
  }, [logout, track, trackRechazo]);

  return <CuentaContext.Provider value={value}>{children}</CuentaContext.Provider>;
}
