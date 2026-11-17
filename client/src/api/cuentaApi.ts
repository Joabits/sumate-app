/**
 * Llamadas HTTP al backend para Mis datos y eliminar la cuenta (Tarea 10).
 * Solo hace la petición: las reglas están en CuentaProvider y en el backend.
 */

import type { ApiResult } from "./apiResults";
import { apiRequestData } from "./http";
import type { CuentaEliminada, MisDatos } from "@/cuenta/context/cuentaTypes";

const BASE_URL = `${import.meta.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api"}/cuenta`;

export const cuentaApi = {
  async getMisDatos(): Promise<ApiResult<MisDatos>> {
    return apiRequestData({
      url: `${BASE_URL}/mis-datos`,
      method: "GET",
      fallbackMessage: "Error al cargar tus datos.",
    });
  },

  async eliminarCuenta(): Promise<ApiResult<CuentaEliminada>> {
    return apiRequestData({
      url: BASE_URL,
      method: "DELETE",
      fallbackMessage: "No se pudo eliminar tu cuenta. Intenta de nuevo.",
    });
  },
};
