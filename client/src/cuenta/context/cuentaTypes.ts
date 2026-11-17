import type { ApiResult } from "@/api/apiResults";

/** Todo lo que la app guarda de la persona (GET /api/cuenta/mis-datos). */
export type MisDatos = {
  perfil: { nombre: string; correo: string; foto: string | null };
  actividadesOrganizadas: {
    id: string;
    nombre: string;
    fecha: string;
    estado: string;
    cupos: number;
    motivoCancelacion: string | null;
  }[];
  solicitudes: {
    actividad: string;
    fechaActividad: string;
    estado: string;
    solicitadaEl: string;
    motivoRetiro: string | null;
  }[];
  horas: {
    actividad: string;
    jornada: string;
    horas: number;
    estado: string;
    motivoReclamo: string | null;
  }[];
  /** Si no está vacía, la regla de la app no deja eliminar la cuenta todavía */
  actividadesPorTerminar: { id: string; nombre: string; fecha: string }[];
};

/** Qué pasó con los datos que afectan a otras personas. */
export type CuentaEliminada = {
  solicitudesRetiradas: number;
  cuposLiberados: number;
  horasConfirmadasConservadas: number;
};

/** Lo que entrega useCuenta(). */
export type CuentaContextValue = {
  getMisDatos: () => Promise<MisDatos>;
  /** Descarga un archivo JSON con los datos de la persona */
  descargarMisDatos: (datos: MisDatos) => void;
  /** Se abrió la confirmación para eliminar la cuenta */
  iniciarEliminacion: (datos: MisDatos) => void;
  /** Elimina la cuenta en el backend y cierra la sesión */
  eliminarCuenta: () => Promise<ApiResult<CuentaEliminada>>;
};
