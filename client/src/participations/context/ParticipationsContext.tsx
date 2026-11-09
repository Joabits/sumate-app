import { createContext } from "react";
import type { ParticipationsContextValue } from "./participationsTypes";

/** Acciones sobre solicitudes de participación. Lo llena ParticipationsProvider. */
export const ParticipationsContext = createContext<ParticipationsContextValue | null>(null);
