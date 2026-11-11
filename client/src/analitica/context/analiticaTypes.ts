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

/** Eventos de la app y las únicas propiedades que lleva cada uno. */
export type Eventos = {
  /** Abrió la confirmación para postular a una actividad */
  postulacion_iniciada: { lista_de_espera: boolean };
  /** La solicitud quedó guardada en el backend */
  postulacion_enviada: { lista_de_espera: boolean };
};

// ── Context ───────────────────────────────────────────────────────────────────

/** Lo que entrega useAnalitica(). */
export type AnaliticaContextValue = {
  /** Registra un evento sin esperar la respuesta */
  track: <E extends keyof Eventos>(evento: E, props: Eventos[E]) => void;
  getAnalitica: () => Promise<Analitica>;
};
