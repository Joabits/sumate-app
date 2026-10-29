/**
 * src/features/activities/infrastructure/schemas/activity.schemas.ts
 *
 * Esquemas Zod para validación de respuestas de API y formularios de actividades.
 */

import { z } from "zod";

export const CauseResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const CauseListResponseSchema = z.object({
  items: z.array(CauseResponseSchema),
});

export const ActivityListItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string(),
  date: z.string(),
  owner_id: z.string(),
  capacity: z.number().int().positive(),
  status: z.enum(["draft", "active", "closed"]),
  creator_name: z.string().nullable().optional(),
  creator_image: z.string().nullable().optional(),
  causes: z.array(CauseResponseSchema).optional().default([]),
  registered_count: z.number().int().nonnegative().optional(),
});

export const ActivityListResponseSchema = z.object({
  items: z.array(ActivityListItemResponseSchema),
});

export const MyActivityListItemResponseSchema = ActivityListItemResponseSchema.extend({
  registered_count: z.number().int().nonnegative(),
});

export const MyActivityListResponseSchema = z.object({
  items: z.array(MyActivityListItemResponseSchema),
});

export const ActivityDetailResponseSchema = z.object({
  id: z.string(),
  activity_id: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  place: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const ActivityParticipantResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
});

export const ActivityDetailDataResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string(),
  date: z.string(),
  owner_id: z.string(),
  capacity: z.number().int().positive(),
  status: z.enum(["draft", "active", "closed"]),
  creator_name: z.string().nullable().optional(),
  creator_image: z.string().nullable().optional(),
  is_owner: z.boolean(),
  is_participating: z.boolean().optional().default(false),
  estado_solicitud: z.enum(["pendiente", "aceptada", "rechazada"]).nullable().optional().default(null),
  participants: z.array(ActivityParticipantResponseSchema).optional().default([]),
  solicitudes_pendientes: z.array(ActivityParticipantResponseSchema).optional().default([]),
  detail: ActivityDetailResponseSchema.nullable().optional(),
  causes: z.array(CauseResponseSchema).optional().default([]),
});

export type CauseResponse = z.infer<typeof CauseResponseSchema>;
export type CauseListResponse = z.infer<typeof CauseListResponseSchema>;
export type ActivityParticipantResponse = z.infer<typeof ActivityParticipantResponseSchema>;
export type ActivityListItemResponse = z.infer<typeof ActivityListItemResponseSchema>;
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
export type MyActivityListItemResponse = z.infer<typeof MyActivityListItemResponseSchema>;
export type MyActivityListResponse = z.infer<typeof MyActivityListResponseSchema>;
export type ActivityDetailResponse = z.infer<typeof ActivityDetailResponseSchema>;
export type ActivityDetailDataResponse = z.infer<typeof ActivityDetailDataResponseSchema>;

export const UpdateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const UpdateDescriptionSchema = z.object({
  description: z.string().min(1, "La descripción no puede estar vacía.").max(5000),
});

export const UpdateActivityInfoSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  date: z.string().min(1).optional(),
});

// Mismo límite que acepta el backend para las imágenes
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const FUTURE_DATE_MESSAGE = "La fecha debe ser posterior a la fecha actual.";

function isFutureDate(value: string): boolean {
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time > Date.now();
}

/**
 * Esquema de validación del formulario de creación de actividades.
 */
export const CreateActivityFormSchema = z.object({
  name: z
    .string({ message: "El nombre de la actividad es obligatorio." })
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  date: z
    .string({ message: "La fecha de la actividad es obligatoria." })
    .min(1, "Por favor selecciona una fecha y hora.")
    .refine(isFutureDate, FUTURE_DATE_MESSAGE),
  capacity: z
    .number({ message: "La cantidad de plazas debe ser un número entero." })
    .int("La cantidad de plazas debe ser un número entero.")
    .positive("La cantidad de plazas debe ser mayor a cero.")
    .max(10000, "La cantidad de plazas no puede superar 10,000."),
  image: z
    .custom<File>(
      (val) => typeof window !== "undefined" && val instanceof File && val.size > 0,
      { message: "Debes seleccionar una imagen para la actividad." }
    )
    .refine(
      (file) => !(file instanceof File) || file.size <= MAX_IMAGE_SIZE_BYTES,
      "La imagen no debe superar los 2MB."
    ),
});

export type CreateActivityFormData = z.infer<typeof CreateActivityFormSchema>;

export const EditTitleSchema = z.object({
  name: z
    .string({ message: "El título es obligatorio." })
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres.")
    .max(120, "El título no puede superar los 120 caracteres."),
});
export type EditTitleFormData = z.infer<typeof EditTitleSchema>;

export const EditDateSchema = z.object({
  date: z
    .string({ message: "La fecha es obligatoria." })
    .min(1, "Por favor selecciona una fecha y hora.")
    .refine(isFutureDate, FUTURE_DATE_MESSAGE),
});
export type EditDateFormData = z.infer<typeof EditDateSchema>;

export const EditCapacitySchema = z.object({
  capacity: z
    .number({ message: "Los cupos deben ser un número." })
    .int("Los cupos deben ser un número entero.")
    .positive("Debe haber al menos 1 cupo disponible.")
    .max(10000, "Los cupos no pueden superar 10,000."),
});
export type EditCapacityFormData = z.infer<typeof EditCapacitySchema>;

export const EditDescriptionSchema = z.object({
  description: z
    .string({ message: "La descripción es requerida." })
    .trim()
    .min(10, "La descripción debe tener al menos 10 caracteres.")
    .max(5000, "La descripción no puede superar los 5,000 caracteres."),
});
export type EditDescriptionFormData = z.infer<typeof EditDescriptionSchema>;

export const TimeOfDayFilterSchema = z.enum([
  "any",
  "early_morning",
  "morning",
  "afternoon",
  "night",
]);

export const DatePresetFilterSchema = z.enum([
  "upcoming",
  "starting_soon",
  "today",
  "tomorrow",
  "this_weekend",
  "next_week",
  "next_weekend",
]);

export const CapacityRangeFilterSchema = z.enum([
  "any",
  "1-9",
  "10-20",
  "gt-20",
]);

export const ActivitySearchParamsSchema = z.object({
  q: z.string().optional(),
  time_of_day: TimeOfDayFilterSchema.optional(),
  date_preset: DatePresetFilterSchema.optional(),
  capacity_range: CapacityRangeFilterSchema.optional(),
  cause_ids: z.array(z.string()).optional(),
});

export type ActivitySearchParamsInput = z.infer<typeof ActivitySearchParamsSchema>;

