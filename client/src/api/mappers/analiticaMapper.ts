/** Lo que responde el backend en /analitica y su conversión a los tipos de la app. */

import type { Analitica, Embudo, Rechazo } from "@/analitica/context/analiticaTypes";

export type AnaliticaResponse = {
  embudos: Embudo[];
  rechazos: Rechazo[];
  ultimos: { evento: string; props: Record<string, unknown>; fecha: string }[];
};

export const analiticaMapper = {
  toAnalitica(dto: AnaliticaResponse): Analitica {
    // El backend ya responde con los nombres de la app (sin snake_case que convertir)
    return { embudos: dto.embudos, rechazos: dto.rechazos, ultimos: dto.ultimos };
  },
};
