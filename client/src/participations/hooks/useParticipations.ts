import { useContext } from "react";
import { ParticipationsContext } from "@/participations/context/ParticipationsContext";

/** Solicitar, salir y revisar solicitudes. Úsalo dentro de ParticipationsProvider. */
export function useParticipations() {
  const context = useContext(ParticipationsContext);
  if (!context) {
    throw new Error("useParticipations debe usarse dentro de <ParticipationsProvider>.");
  }
  return context;
}
