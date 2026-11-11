/**
 * Lo que responde el backend en /horas y su conversión a los tipos de la app.
 * Solo transforma datos: las reglas están en HorasProvider.
 */

import type {
  Constancia,
  EstadoHoras,
  HorasActividad,
  RegistroHoras,
} from "@/horas/context/horasTypes";

export type RegistroHorasResponse = {
  id: string;
  user_id: string;
  user_name: string;
  user_image?: string | null;
  jornada: string;
  horas: number;
  estado: EstadoHoras;
  motivo_reclamo?: string | null;
  horas_anteriores?: number | null;
};

export type HorasActividadResponse = {
  activity_id: string;
  es_organizador: boolean;
  puede_registrar: boolean;
  participantes_aceptados?: { id: string; name: string; image?: string | null }[];
  registros?: RegistroHorasResponse[];
  total_confirmado: number;
};

export type ConstanciaResponse = {
  voluntario: string;
  correo: string;
  emitida: string;
  actividades: {
    activity_id: string;
    nombre: string;
    organizador?: string | null;
    fecha: string;
    jornadas: { jornada: string; horas: number }[];
    total_horas: number;
  }[];
  total_horas: number;
};

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

  toHorasActividad(dto: HorasActividadResponse): HorasActividad {
    return {
      activityId: dto.activity_id,
      esOrganizador: dto.es_organizador,
      puedeRegistrar: dto.puede_registrar,
      participantesAceptados: (dto.participantes_aceptados ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image ?? null,
      })),
      registros: (dto.registros ?? []).map(horasMapper.toRegistro),
      totalConfirmado: dto.total_confirmado,
    };
  },

  toConstancia(dto: ConstanciaResponse): Constancia {
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
