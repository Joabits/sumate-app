/** Lectura del panel de analítica. */

import type { Analitica } from "@/analitica/analiticaTypes";
import { analiticaApi } from "./analiticaApi";

export async function getAnaliticaQuery(): Promise<Analitica> {
  const response = await analiticaApi.getAnalitica();
  if (!response.ok) {
    throw new Error(response.errors?.[0] ?? "Error al cargar la analítica.");
  }
  return response.data;
}
