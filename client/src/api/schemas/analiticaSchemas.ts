/** Esquema Zod del resumen de analítica y su conversión a los tipos de la app. */

import { z } from "zod";
import type { Analitica } from "@/analitica/analiticaTypes";

const ConteoSchema = z.object({
  iniciadas: z.number(),
  enviadas: z.number(),
});

export const AnaliticaResponseSchema = z.object({
  postulacion: z.object({
    total: ConteoSchema,
    con_cupos: ConteoSchema,
    lista_de_espera: ConteoSchema,
  }),
  ultimos: z.array(
    z.object({
      evento: z.string(),
      props: z.record(z.string(), z.unknown()),
      fecha: z.string(),
    }),
  ),
});

type AnaliticaResponse = z.infer<typeof AnaliticaResponseSchema>;

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
