import { createContext } from "react";
import type { AnaliticaContextValue } from "./analiticaTypes";

/** Registrar eventos y leer el panel de analítica. Lo llena AnaliticaProvider. */
export const AnaliticaContext = createContext<AnaliticaContextValue | null>(null);
