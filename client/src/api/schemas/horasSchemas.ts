/** Esquemas Zod de las respuestas de horas y su conversión a los tipos de la app. */

import { z } from "zod";
import type { Constancia, HorasActividad, RegistroHoras } from "@/horas/context/horasTypes";

const RegistroHorasResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  user_image: z.string().nullable().optional(),
  jornada: z.string(),
  horas: z.number(),
  estado: z.enum(["pendiente", "confirmada", "reclamada"]),
  motivo_reclamo: z.string().nullable().optional(),
  horas_anteriores: z.number().nullable().optional(),
});

export const HorasActividadResponseSchema = z.object({
  activity_id: z.string(),
  es_organizador: z.boolean(),
  puede_registrar: z.boolean(),
  participantes_aceptados: z
    .array(z.object({ id: z.string(), name: z.string(), image: z.string().nullable().optional() }))
    .default([]),
  registros: z.array(RegistroHorasResponseSchema).default([]),
  total_confirmado: z.number(),
});

export const ConstanciaResponseSchema = z.object({
  voluntario: z.string(),
  correo: z.string(),
  emitida: z.string(),
  actividades: z.array(
    z.object({
      activity_id: z.string(),
      nombre: z.string(),
      organizador: z.string().nullable().optional(),
      fecha: z.string(),
      jornadas: z.array(z.object({ jornada: z.string(), horas: z.number() })),
      total_horas: z.number(),
    }),
  ),
  total_horas: z.number(),
});

type RegistroHorasResponse = z.infer<typeof RegistroHorasResponseSchema>;

export const horasMapper = {
  toRegistro(dto: RegistroHorasResponse): RegistroHoras {
    return {
      id: dto.id,
      userId: dto.user_id,
      userName: dto.user_name,
      userImage: dto.user_image ?? null,
      jornada: dto.jornada,
      horas: dto.horas,
      estado: dto.estado,
      motivoReclamo: dto.motivo_reclamo ?? null,
      horasAnteriores: dto.horas_anteriores ?? null,
    };
  },

  toHorasActividad(dto: z.infer<typeof HorasActividadResponseSchema>): HorasActividad {
    return {
      activityId: dto.activity_id,
      esOrganizador: dto.es_organizador,
      puedeRegistrar: dto.puede_registrar,
      participantesAceptados: dto.participantes_aceptados.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image ?? null,
      })),
      registros: dto.registros.map(horasMapper.toRegistro),
      totalConfirmado: dto.total_confirmado,
    };
  },

  toConstancia(dto: z.infer<typeof ConstanciaResponseSchema>): Constancia {
    return {
      voluntario: dto.voluntario,
      correo: dto.correo,
      emitida: dto.emitida,
      totalHoras: dto.total_horas,
      actividades: dto.actividades.map((a) => ({
        activityId: a.activity_id,
        nombre: a.nombre,
        organizador: a.organizador ?? null,
        fecha: a.fecha,
        jornadas: a.jornadas,
        totalHoras: a.total_horas,
      })),
    };
  },
};
