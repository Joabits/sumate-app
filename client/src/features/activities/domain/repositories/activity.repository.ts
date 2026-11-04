/**
 * src/features/activities/domain/repositories/activity.repository.ts
 *
 * Contrato de repositorio para el módulo de actividades.
 * Sin prefijo 'I' según directrices constitucionales de frontend.
 */

import type {
  ApiActionResult,
  ApiResult,
} from "@/features/shared/domain/types/api-results";
import type {
  ActivityDetailData,
  ActivityListItem,
  ActivitySearchParams,
  Cause,
  MyActivityListItem,
} from "../entities/activity.entity";

export interface ActivityRepository {
  /**
   * Obtiene la lista de actividades para explorar (futuras y de terceros).
   */
  listExplore(): Promise<ApiResult<ActivityListItem[]>>;

  /**
   * Busca actividades según criterios de texto, fecha, hora, cupos y causas.
   */
  searchActivities(params?: ActivitySearchParams): Promise<ApiResult<ActivityListItem[]>>;

  /**
   * Obtiene la lista de actividades creadas por el usuario con conteo de inscritos.
   */
  listMyActivities(): Promise<ApiResult<MyActivityListItem[]>>;

  /**
   * Obtiene el detalle completo de una actividad por su ID.
   */
  getActivityDetail(id: string): Promise<ApiResult<ActivityDetailData>>;

  /**
   * Obtiene el catálogo completo de causas disponibles.
   */
  listCauses(): Promise<ApiResult<Cause[]>>;

  /**
   * Reemplaza la lista de causas asignadas a una actividad.
   */
  replaceActivityCauses(
    id: string,
    causeIds: string[]
  ): Promise<ApiActionResult>;

  /**
   * Registra una nueva actividad enviando los datos multipart (imagen, nombre y fecha).
   */
  createActivity(formData: FormData): Promise<ApiActionResult>;

  /**
   * Actualiza la ubicación geográfica y resuelve el lugar y dirección mediante Nominatim.
   */
  updateLocation(
    id: string,
    data: { latitude: number; longitude: number }
  ): Promise<ApiActionResult>;

  /**
   * Actualiza la descripción de la actividad.
   */
  updateDescription(
    id: string,
    data: { description: string }
  ): Promise<ApiActionResult>;

  /**
   * Reemplaza la imagen de portada de la actividad.
   */
  updateImage(id: string, formData: FormData): Promise<ApiActionResult>;

  /**
   * Actualiza los datos base (título y fecha) de la actividad.
   */
  updateInfo(
    id: string,
    data: { name?: string; date?: string }
  ): Promise<ApiActionResult>;

  /**
   * Actualiza la capacidad de plazas de la actividad.
   */
  updateCapacity(
    id: string,
    data: { capacity: number }
  ): Promise<ApiActionResult>;

  /**
   * Publica la actividad cambiando su estado a active tras validar completitud.
   */
  publishActivity(id: string): Promise<ApiActionResult>;

  /**
   * Cierra la convocatoria de la actividad.
   */
  closeActivity(id: string): Promise<ApiActionResult>;

  /**
   * Cancela una actividad publicada. El motivo es obligatorio y lo ven los voluntarios.
   */
  cancelarActividad(id: string, motivo: string): Promise<ApiActionResult>;

  /**
   * Reabre la convocatoria de una actividad cerrada.
   */
  reopenActivity(id: string): Promise<ApiActionResult>;

  /**
   * Elimina una actividad creada por el usuario (físicamente, si no tiene participantes).
   */
  deleteActivity(id: string): Promise<ApiActionResult>;
}

