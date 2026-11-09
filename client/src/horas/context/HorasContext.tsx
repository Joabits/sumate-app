import { createContext } from "react";
import type { HorasContextValue } from "./horasTypes";

/** Acciones sobre horas de voluntariado. Lo llena HorasProvider. */
export const HorasContext = createContext<HorasContextValue | null>(null);
