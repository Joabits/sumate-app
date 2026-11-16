import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { activitiesApi } from "@/api/activitiesApi";
import { datosOError, type ApiActionResult } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { ActivitiesContext } from "./ActivitiesContext";
import type {
  ActivitiesContextValue as Ctx,
  ActivitySearchParams,
  Cause,
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

/**
 * Deja solo los filtros que de verdad restringen la búsqueda: "cualquier
 * horario", "próximas" y "todas las causas" son lo que el backend ya hace sin filtro.
 */
function filtrosActivos(p: ActivitySearchParams): ActivitySearchParams {
  const conUbicacion = p.userLat !== undefined && p.userLon !== undefined;
  return {
    q: p.q?.trim() || undefined,
    timeOfDay: p.timeOfDay !== "any" ? p.timeOfDay : undefined,
    datePreset: p.datePreset !== "upcoming" ? p.datePreset : undefined,
    capacityRange: p.capacityRange !== "any" ? p.capacityRange : undefined,
    causeIds: p.causeIds?.filter((id) => id && id !== "all"),
    userLat: conUbicacion ? p.userLat : undefined,
    userLon: conUbicacion ? p.userLon : undefined,
    maxDistanceKm: p.maxDistanceKm,
  };
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

  const value = useMemo<Ctx>(() => {
    /** Espera la llamada y, si salió bien, pide a las páginas que recarguen. */
    const conRecarga = async (llamada: Promise<ApiActionResult>) => {
      const result = await llamada;
      if (result.ok) refresh();
      return result;
    };

    // ── Lecturas ────────────────────────────────────────────────────────────
    const getExploreActivities: Ctx["getExploreActivities"] = async () =>
      datosOError(await activitiesApi.listExplore());

    const getMyActivities: Ctx["getMyActivities"] = async () =>
      datosOError(await activitiesApi.listMyActivities());

    const getActivityDetail: Ctx["getActivityDetail"] = async (id) => {
      const response = await activitiesApi.getActivityDetail(id);
      // No existe (o es un borrador de otra persona)
      if (!response.ok && response.statusCode === 404) return null;
      return datosOError(response);
    };

    const searchActivities: Ctx["searchActivities"] = async (params) =>
      datosOError(await activitiesApi.searchActivities(filtrosActivos(params)));

    // ── Acciones ────────────────────────────────────────────────────────────
    const createActivity: Ctx["createActivity"] = async (datos) => {
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
    };

    const updateTitle: Ctx["updateTitle"] = async (id, nombre) => {
      const error = validarTitulo(nombre);
      if (error) return invalidResult(error);
      return conRecarga(activitiesApi.updateInfo(id, { name: nombre.trim() }));
    };

    const updateDate: Ctx["updateDate"] = async (id, fecha) => {
      const error = validarFecha(fecha);
      if (error) return invalidResult(error);
      return conRecarga(activitiesApi.updateInfo(id, { date: aIsoUtc(fecha) }));
    };

    const updateCapacity: Ctx["updateCapacity"] = async (id, cupos) => {
      const error = validarCupos(cupos);
      if (error) return invalidResult(error);
      return conRecarga(activitiesApi.updateCapacity(id, { capacity: cupos }));
    };

    const updateDescription: Ctx["updateDescription"] = async (id, descripcion) => {
      const error = validarDescripcion(descripcion);
      if (error) return invalidResult(error);
      return conRecarga(activitiesApi.updateDescription(id, { description: descripcion.trim() }));
    };

    const updateImage: Ctx["updateImage"] = async (id, imagen) => {
      const error = validarPortada(imagen);
      if (error) return invalidResult(error);
      return conRecarga(activitiesApi.updateImage(id, imagen));
    };

    const updateLocation: Ctx["updateLocation"] = async (id, latitude, longitude, place) => {
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return invalidResult("Coordenadas geográficas inválidas.");
      }
      const lugar = place?.trim();
      return conRecarga(
        activitiesApi.updateLocation(id, { latitude, longitude, ...(lugar ? { place: lugar } : {}) }),
      );
    };

    const replaceCauses: Ctx["replaceCauses"] = (id, causeIds) =>
      conRecarga(activitiesApi.replaceActivityCauses(id, causeIds));

    const publish: Ctx["publish"] = (id) => conRecarga(activitiesApi.publishActivity(id));

    const close: Ctx["close"] = (id) => conRecarga(activitiesApi.closeActivity(id));

    const reopen: Ctx["reopen"] = (id) => conRecarga(activitiesApi.reopenActivity(id));

    const cancelar: Ctx["cancelar"] = async (id, motivo) => {
      if (!motivo.trim()) return invalidResult("Escribe el motivo de la cancelación.");
      return conRecarga(activitiesApi.cancelarActividad(id, motivo.trim()));
    };

    const deleteActivity: Ctx["deleteActivity"] = (id) =>
      conRecarga(activitiesApi.deleteActivity(id));

    return {
      causes,
      isLoadingCauses,
      dataVersion,
      refresh,
      getExploreActivities,
      getMyActivities,
      getActivityDetail,
      searchActivities,
      createActivity,
      updateTitle,
      updateDate,
      updateCapacity,
      updateDescription,
      updateImage,
      updateLocation,
      replaceCauses,
      publish,
      close,
      reopen,
      cancelar,
      deleteActivity,
    };
  }, [causes, isLoadingCauses, dataVersion, refresh]);

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}
