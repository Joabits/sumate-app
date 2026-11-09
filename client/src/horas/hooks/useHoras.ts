import { useContext } from "react";
import { HorasContext } from "@/horas/context/HorasContext";

/** Registrar, corregir, aceptar y reclamar horas. Úsalo dentro de HorasProvider. */
export function useHoras() {
  const context = useContext(HorasContext);
  if (!context) {
    throw new Error("useHoras debe usarse dentro de <HorasProvider>.");
  }
  return context;
}
