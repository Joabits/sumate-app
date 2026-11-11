/**
 * Analítica de interacción.
 *
 * Cada vez que alguien empieza o termina un flujo principal se guarda una
 * línea en la tabla eventos del backend y el panel /analitica las cuenta.
 * Se registra la acción, no a la persona: un evento no lleva usuario, correo,
 * nombre ni la actividad, solo sus propiedades fijas.
 */
import { analiticaApi } from "@/api/analiticaApi";

/** Eventos de la app y las únicas propiedades que lleva cada uno. */
export type Eventos = {
  /** Abrió la confirmación para postular a una actividad */
  postulacion_iniciada: { lista_de_espera: boolean };
  /** La solicitud quedó guardada en el backend */
  postulacion_enviada: { lista_de_espera: boolean };
};

/**
 * Registra el evento sin esperar la respuesta: si falla, la persona sigue
 * con lo que estaba haciendo. La fecha la pone el backend al guardarlo.
 */
export function track<E extends keyof Eventos>(evento: E, props: Eventos[E]): void {
  if (import.meta.env.DEV) {
    console.log("[evento]", { evento, props });
  }
  void analiticaApi.registrarEvento(evento, props);
}
