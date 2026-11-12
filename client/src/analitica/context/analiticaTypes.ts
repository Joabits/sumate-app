import type { ApiError } from "@/api/apiResults";

// ── Panel /analitica ──────────────────────────────────────────────────────────

/** Un paso de un embudo y cuántos llegaron a él. */
export type PasoEmbudo = {
  evento: string;
  etiqueta: string;
  cantidad: number;
};

/** Un flujo principal: sus pasos en orden y cuántas veces se frenó por un error. */
export type Embudo = {
  clave: string;
  titulo: string;
  /** La pregunta que responde */
  pregunta: string;
  pasos: PasoEmbudo[];
  /** Veces que el flujo se frenó (accion_rechazada) */
  rechazos: number;
};

export type Rechazo = {
  flujo: FlujoRechazado;
  motivo: MotivoRechazo;
  cantidad: number;
};

export type EventoRegistrado = {
  evento: string;
  props: Record<string, unknown>;
  fecha: string;
};

export type Analitica = {
  embudos: Embudo[];
  /** Errores que frenan la tarea, del motivo más frecuente al menos */
  rechazos: Rechazo[];
  /** Los últimos 10 eventos guardados, del más nuevo al más viejo */
  ultimos: EventoRegistrado[];
};

// ── Plan de eventos (evidencias/tarea-9.md) ───────────────────────────────────

/** Flujos que pueden frenarse por un error. Lista fija. */
export type FlujoRechazado =
  | "postulacion"
  | "retiro"
  | "crear_actividad"
  | "publicar_actividad"
  | "horas";

/** Por qué se frenó. Lista fija: nunca el mensaje del error ni lo que escribió la persona. */
export type MotivoRechazo =
  | "fuera_de_plazo"
  | "sin_cupos"
  | "sin_permiso"
  | "validacion"
  | "actividad_cancelada"
  | "conflicto";

/** Eventos de la app y las únicas propiedades que lleva cada uno. */
export type Eventos = {
  /** Abrió la confirmación para postular a una actividad */
  postulacion_iniciada: { lista_de_espera: boolean };
  /** La solicitud quedó guardada en el backend */
  postulacion_enviada: { lista_de_espera: boolean };
  /** El organizador aceptó una solicitud pendiente */
  solicitud_aceptada: Record<string, never>;
  /** Abrió la confirmación para retirarse */
  retiro_iniciado: { estado: "pendiente" | "aceptada" | "en_espera" };
  /** El retiro quedó guardado */
  retiro_confirmado: {
    estado: "pendiente" | "aceptada" | "en_espera";
    entro_de_lista_de_espera: boolean;
  };
  /** Abrió el formulario para crear una actividad */
  actividad_creacion_iniciada: Record<string, never>;
  /** El borrador quedó guardado */
  actividad_creada: Record<string, never>;
  /** La actividad quedó publicada */
  actividad_publicada: Record<string, never>;
  /** La organización registró una jornada para N participantes */
  horas_registradas: { participantes: number };
  /** El voluntario aceptó o reclamó sus horas */
  horas_respondidas: { respuesta: "aceptadas" | "reclamadas" };
  /** Se ejecutó una búsqueda (sin el texto buscado) */
  busqueda_realizada: { con_texto: boolean; con_filtros: boolean; con_resultados: boolean };
  /** Un error de validación o permiso frenó la tarea */
  accion_rechazada: { flujo: FlujoRechazado; motivo: MotivoRechazo };
};

// ── Context ───────────────────────────────────────────────────────────────────

/** Lo que entrega useAnalitica(). */
export type AnaliticaContextValue = {
  /** Registra un evento sin esperar la respuesta */
  track: <E extends keyof Eventos>(evento: E, props: Eventos[E]) => void;
  /**
   * Registra accion_rechazada si el error frenó la tarea (validación, permiso,
   * plazo...). Los errores de red o del servidor no se registran.
   */
  trackRechazo: (flujo: FlujoRechazado, error: ApiError) => void;
  getAnalitica: () => Promise<Analitica>;
};
