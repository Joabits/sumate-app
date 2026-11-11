/** Lo que responde el backend en /analitica y su conversión a los tipos de la app. */

import type { Analitica, Conteo } from "@/analitica/context/analiticaTypes";

export type AnaliticaResponse = {
  postulacion: {
    total: Conteo;
    con_cupos: Conteo;
    lista_de_espera: Conteo;
  };
  ultimos: { evento: string; props: Record<string, unknown>; fecha: string }[];
};

export const analiticaMapper = {
  toAnalitica(dto: AnaliticaResponse): Analitica {
    return {
      postulacion: {
        total: dto.postulacion.total,
        conCupos: dto.postulacion.con_cupos,
        listaDeEspera: dto.postulacion.lista_de_espera,
      },
      ultimos: dto.ultimos,
    };
  },
};
