/**
 * src/features/participations/infrastructure/schemas/participation.schemas.ts
 *
 * Esquemas Zod para respuestas de API del módulo de participaciones.
 */

import { z } from "zod";
import { CauseResponseSchema } from "@/features/activities/infrastructure/schemas/activity.schemas";

export const ParticipatedActivityItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string(),
  date: z.string(),
  owner_id: z.string(),
  capacity: z.number().int().positive(),
  status: z.string(),
  enrolled_date: z.string(),
  is_past: z.boolean(),
  estado_solicitud: z.enum(["pendiente", "aceptada", "rechazada"]).optional().default("aceptada"),
  creator_name: z.string().nullable().optional(),
  creator_image: z.string().nullable().optional(),
  causes: z.array(CauseResponseSchema).optional().default([]),
});

export const ParticipatedActivityListResponseSchema = z.object({
  items: z.array(ParticipatedActivityItemResponseSchema),
});

export type ParticipatedActivityItemResponse = z.infer<
  typeof ParticipatedActivityItemResponseSchema
>;
export type ParticipatedActivityListResponse = z.infer<
  typeof ParticipatedActivityListResponseSchema
>;
