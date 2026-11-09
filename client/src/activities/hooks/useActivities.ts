import { useContext } from "react";
import { ActivitiesContext } from "@/activities/context/ActivitiesContext";

/** Causas y acciones sobre actividades. Úsalo dentro de ActivitiesProvider. */
export function useActivities() {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error("useActivities debe usarse dentro de <ActivitiesProvider>.");
  }
  return context;
}
