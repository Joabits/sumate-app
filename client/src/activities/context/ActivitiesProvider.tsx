import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { activitiesApi } from "@/api/activitiesApi";
import type { ApiActionResult, ApiResult } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { ActivitiesContext } from "./ActivitiesContext";
import type {
  ActivitiesContextValue,
  ActivityDetailData,
  ActivityListItem,
  ActivitySearchParams,
  Cause,
  MyActivityListItem,
  NuevaActividad,
} from "./activitiesTypes";

// Mismos límites que acepta el backend
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_CUPOS = 10000;

// ── Validaciones ──────────────────────────────────────────────────────────────
// Cada una devuelve el mensaje para la persona, o null si el dato está bien.

function esFechaFutura(valor: string): boolean {
  const time = new Date(valor).getTime();
  return !Number.isNaN(time) && time > Date.now();
}

function validarFecha(fecha: string): string | null {
  if (!fecha) return "Por favor selecciona una fecha y hora.";
  if (!esFechaFutura(fecha)) return "La fecha debe ser posterior a la fecha actual.";
  return null;
}

function validarNuevaActividad(datos: NuevaActividad): string | null {
  const nombre = datos.name.trim();
  if (nombre.length < 3) return "El nombre debe tener al menos 3 caracteres.";
  if (nombre.length > 120) return "El nombre no puede superar los 120 caracteres.";

  const errorFecha = validarFecha(datos.date);
  if (errorFecha) return errorFecha;

  if (!Number.isInteger(datos.capacity)) return "La cantidad de plazas debe ser un número entero.";
  if (datos.capacity <= 0) return "La cantidad de plazas debe ser mayor a cero.";
  if (datos.capacity > MAX_CUPOS) return "La cantidad de plazas no puede superar 10,000.";

  if (!datos.image || datos.image.size === 0) return "Debes seleccionar una imagen para la actividad.";
  if (datos.image.size > MAX_IMAGE_SIZE_BYTES) return "La imagen no debe superar los 2MB.";
  return null;
}

function validarTitulo(nombre: string): string | null {
  const limpio = nombre.trim();
  if (limpio.length < 3) return "El título debe tener al menos 3 caracteres.";
  if (limpio.length > 120) return "El título no puede superar los 120 caracteres.";
  return null;
}

function validarCupos(cupos: number): string | null {
  if (Number.isNaN(cupos)) return "Los cupos deben ser un número.";
  if (!Number.isInteger(cupos)) return "Los cupos deben ser un número entero.";
  if (cupos <= 0) return "Debe haber al menos 1 cupo disponible.";
  if (cupos > MAX_CUPOS) return "Los cupos no pueden superar 10,000.";
  return null;
}

function validarDescripcion(descripcion: string): string | null {
  const limpia = descripcion.trim();
  if (limpia.length < 10) return "La descripción debe tener al menos 10 caracteres.";
  if (limpia.length > 5000) return "La descripción no puede superar los 5,000 caracteres.";
  return null;
}

function validarPortada(imagen: File): string | null {
  if (!imagen.type.startsWith("image/")) return "El archivo debe ser una imagen válida.";
  if (imagen.size > MAX_IMAGE_SIZE_BYTES) return "La imagen no debe superar los 2MB.";
  return null;
}

/** El valor de un <input type="datetime-local"> es hora local; el backend recibe UTC. */
const aIsoUtc = (fechaLocal: string) => new Date(fechaLocal).toISOString();

/** Para las lecturas: si el backend falla, lanza el error que muestra la página. */
function datosOError<T>(response: ApiResult<T>, mensaje: string): T {
  if (!response.ok) throw new Error(response.errors?.[0] ?? mensaje);
  return response.data;
}

/**
 * Lógica de actividades. Valida los datos, llama a la API y expone a los
 * componentes las lecturas y las acciones (crear, editar, publicar, cancelar...).
 *
 * Cada acción que sale bien sube `dataVersion`; las páginas abiertas lo
 * vigilan y vuelven a pedir sus datos al backend.
 */
export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [isLoadingCauses, setIsLoadingCauses] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);

  // El catálogo de causas se carga una sola vez al entrar a la app
  useEffect(() => {
    let active = true;
    activitiesApi
      .listCauses()
      .then((res) => {
        if (active && res.ok) setCauses(res.data);
      })
      .catch(() => undefined)
      .finally(() => active && setIsLoadingCauses(false));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ActivitiesContextValue>(() => {
    /** Espera la llamada y, si salió bien, pide a las páginas que recarguen. */
    const conRecarga = async (llamada: Promise<ApiActionResult>) => {
      const result = await llamada;
      if (result.ok) refresh();
      return result;
    };

    return {
      causes,
      isLoadingCauses,
      dataVersion,
      refresh,

      // ── Lecturas ──────────────────────────────────────────────────────────
      getExploreActivities: async (): Promise<ActivityListItem[]> =>
        datosOError(
          await activitiesApi.listExplore(),
          "Error al cargar las actividades para explorar.",
        ),

      getMyActivities: async (): Promise<MyActivityListItem[]> =>
        datosOError(await activitiesApi.listMyActivities(), "Error al cargar mis actividades."),

      getActivityDetail: async (id: string): Promise<ActivityDetailData | null> => {
        const response = await activitiesApi.getActivityDetail(id);
        // No existe (o es un borrador de otra persona)
        if (!response.ok && response.statusCode === 404) return null;
        return datosOError(response, "Error al cargar los detalles de la actividad.");
      },

      searchActivities: async (params: ActivitySearchParams): Promise<ActivityListItem[]> =>
        datosOError(
          await activitiesApi.searchActivities(params),
          "Error al realizar la búsqueda de actividades.",
        ),

      // ── Acciones ──────────────────────────────────────────────────────────
      createActivity: async (datos: NuevaActividad) => {
        const error = validarNuevaActividad(datos);
        if (error) return invalidResult(error);
        return conRecarga(
          activitiesApi.createActivity({
            name: datos.name.trim(),
            date: aIsoUtc(datos.date),
            capacity: datos.capacity,
            image: datos.image as File,
          }),
        );
      },

      updateTitle: async (id: string, nombre: string) => {
        const error = validarTitulo(nombre);
        if (error) return invalidResult(error);
        return conRecarga(activitiesApi.updateInfo(id, { name: nombre.trim() }));
      },

      updateDate: async (id: string, fecha: string) => {
        const error = validarFecha(fecha);
        if (error) return invalidResult(error);
        return conRecarga(activitiesApi.updateInfo(id, { date: aIsoUtc(fecha) }));
      },

      updateCapacity: async (id: string, cupos: number) => {
        const error = validarCupos(cupos);
        if (error) return invalidResult(error);
        return conRecarga(activitiesApi.updateCapacity(id, { capacity: cupos }));
      },

      updateDescription: async (id: string, descripcion: string) => {
        const error = validarDescripcion(descripcion);
        if (error) return invalidResult(error);
        return conRecarga(
          activitiesApi.updateDescription(id, { description: descripcion.trim() }),
        );
      },

      updateImage: async (id: string, imagen: File) => {
        const error = validarPortada(imagen);
        if (error) return invalidResult(error);
        return conRecarga(activitiesApi.updateImage(id, imagen));
      },

      updateLocation: async (id: string, latitude: number, longitude: number, place?: string) => {
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return invalidResult("Coordenadas geográficas inválidas.");
        }
        return conRecarga(
          activitiesApi.updateLocation(id, {
            latitude,
            longitude,
            ...(place?.trim() ? { place: place.trim() } : {}),
          }),
        );
      },

      replaceCauses: (id: string, causeIds: string[]) =>
        conRecarga(activitiesApi.replaceActivityCauses(id, causeIds)),

      publish: (id: string) => conRecarga(activitiesApi.publishActivity(id)),

      close: (id: string) => conRecarga(activitiesApi.closeActivity(id)),

      reopen: (id: string) => conRecarga(activitiesApi.reopenActivity(id)),

      cancelar: async (id: string, motivo: string) => {
        if (!motivo.trim()) return invalidResult("Escribe el motivo de la cancelación.");
        return conRecarga(activitiesApi.cancelarActividad(id, motivo.trim()));
      },

      deleteActivity: (id: string) => conRecarga(activitiesApi.deleteActivity(id)),
    };
  }, [causes, isLoadingCauses, dataVersion, refresh]);

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}
