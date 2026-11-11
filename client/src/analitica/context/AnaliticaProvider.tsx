import { useMemo, type ReactNode } from "react";
import { analiticaApi } from "@/api/analiticaApi";
import { AnaliticaContext } from "./AnaliticaContext";
import type { Analitica, AnaliticaContextValue } from "./analiticaTypes";

/**
 * Analítica de interacción.
 *
 * Cada vez que alguien empieza o termina un flujo principal se guarda una
 * línea en la tabla eventos del backend y el panel /analitica las cuenta.
 * Se registra la acción, no a la persona: un evento no lleva usuario, correo,
 * nombre ni la actividad, solo sus propiedades fijas.
 */
export function AnaliticaProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AnaliticaContextValue>(
    () => ({
      // Sin esperar la respuesta: si falla, la persona sigue con lo que hacía.
      // La fecha la pone el backend al guardarlo.
      track: (evento, props) => {
        if (import.meta.env.DEV) {
          console.log("[evento]", { evento, props });
        }
        void analiticaApi.registrarEvento(evento, props);
      },

      getAnalitica: async (): Promise<Analitica> => {
        const response = await analiticaApi.getAnalitica();
        if (!response.ok) throw new Error(response.errors?.[0] ?? "Error al cargar la analítica.");
        return response.data;
      },
    }),
    [],
  );

  return <AnaliticaContext.Provider value={value}>{children}</AnaliticaContext.Provider>;
}
