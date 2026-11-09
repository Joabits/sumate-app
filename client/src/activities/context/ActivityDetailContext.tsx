import { createContext } from "react";
import type { ActivityDetailContextValue } from "./activitiesTypes";

/** La actividad abierta en el detalle y su modo edición. Lo llena ActivityDetailProvider. */
export const ActivityDetailContext = createContext<ActivityDetailContextValue | null>(null);
