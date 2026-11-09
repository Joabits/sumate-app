import { createContext } from "react";
import type { ActivitiesContextValue } from "./activitiesTypes";

/** Catálogo de causas y acciones sobre actividades. Lo llena ActivitiesProvider. */
export const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);
