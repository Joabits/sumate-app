import { useContext } from "react";
import { CuentaContext } from "@/cuenta/context/CuentaContext";

/** Ver y descargar mis datos, y eliminar la cuenta. Úsalo dentro de CuentaProvider. */
export function useCuenta() {
  const context = useContext(CuentaContext);
  if (!context) {
    throw new Error("useCuenta debe usarse dentro de <CuentaProvider>.");
  }
  return context;
}
