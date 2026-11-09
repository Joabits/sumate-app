import { useContext } from "react";
import { ActivityDetailContext } from "@/activities/context/ActivityDetailContext";

/** La actividad abierta y su modo edición. Úsalo dentro de ActivityDetailProvider. */
export function useActivityDetail() {
  const context = useContext(ActivityDetailContext);
  if (!context) {
    throw new Error("useActivityDetail debe usarse dentro de <ActivityDetailProvider>.");
  }
  return context;
}
