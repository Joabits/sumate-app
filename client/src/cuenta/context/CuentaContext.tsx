import { createContext } from "react";
import type { CuentaContextValue } from "./cuentaTypes";

/** Mis datos y eliminar la cuenta. Lo llena CuentaProvider. */
export const CuentaContext = createContext<CuentaContextValue | null>(null);
