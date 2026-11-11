/** Cuántas postulaciones empezaron y cuántas terminaron. */
export type Conteo = {
  iniciadas: number;
  enviadas: number;
};

export type EventoRegistrado = {
  evento: string;
  props: Record<string, unknown>;
  fecha: string;
};

export type Analitica = {
  postulacion: {
    total: Conteo;
    conCupos: Conteo;
    listaDeEspera: Conteo;
  };
  /** Los últimos 10 eventos guardados, del más nuevo al más viejo */
  ultimos: EventoRegistrado[];
};
