import { useContext } from "react";
import { AnaliticaContext } from "@/analitica/context/AnaliticaContext";

/** Registrar eventos y leer el panel de analítica. Úsalo dentro de AnaliticaProvider. */
export function useAnalitica() {
  const context = useContext(AnaliticaContext);
  if (!context) {
    throw new Error("useAnalitica debe usarse dentro de <AnaliticaProvider>.");
  }
  return context;
}
