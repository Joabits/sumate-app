import { useMemo, type ReactNode } from "react";
import { useActivities } from "@/activities/hooks/useActivities";
import { datosOError, type ApiActionResult, type ApiError } from "@/api/apiResults";
import { invalidResult } from "@/api/errors/apiError";
import { participationsApi } from "@/api/participationsApi";
import { ParticipationsContext } from "./ParticipationsContext";
import {
  MOTIVO_RETIRO_MAX,
  PLAZO_RETIRO_MS,
  type ParticipationsContextValue as Ctx,
} from "./participationsTypes";

/** Un aceptado ya no puede retirarse si faltan menos de 24 horas. */
function retiroFueraDePlazo(fechaActividad: string, ahora = Date.now()): boolean {
  return new Date(fechaActividad).getTime() - ahora < PLAZO_RETIRO_MS;
}

/** Mismo código que responde el backend, para tratar los dos casos igual. */
function fueraDePlazoResult(): ApiError {
  return {
    ok: false,
    statusCode: 409,
    code: "RETIRO_FUERA_DE_PLAZO",
    errors: [
      "Ya no puedes retirarte: faltan menos de 24 horas para la actividad. Avisa directamente a la organización.",
    ],
  };
}

/** El motivo que debe escribir un aceptado: devuelve el error para la persona o null. */
function validarMotivoRetiro(motivo: string): string | null {
  if (!motivo) return "Escribe el motivo por el que te retiras.";
  if (motivo.length > MOTIVO_RETIRO_MAX) {
    return `El motivo puede tener hasta ${MOTIVO_RETIRO_MAX} caracteres.`;
  }
  return null;
}

/**
 * Lógica de participación: el voluntario solicita o se retira, y el organizador
 * acepta o rechaza. Va dentro de ActivitiesProvider y usa su refresh():
 * después de cada acción las páginas abiertas recargan sus datos.
 */
export function ParticipationsProvider({ children }: { children: ReactNode }) {
  const { refresh } = useActivities();

  const value = useMemo<Ctx>(() => {
    /** Espera la llamada y, si salió bien, pide a las páginas que recarguen. */
    const conRecarga = async <T extends ApiActionResult>(llamada: Promise<T>) => {
      const result = await llamada;
      if (result.ok) refresh();
      return result;
    };

    const getMyParticipations: Ctx["getMyParticipations"] = async () =>
      datosOError(await participationsApi.listMyParticipations());

    const join: Ctx["join"] = async (activityId) => {
      if (!activityId.trim()) return invalidResult("ID de actividad inválido.");
      return conRecarga(participationsApi.joinActivity(activityId));
    };

    const retirarse: Ctx["retirarse"] = async (activityId, { estado, fechaActividad, motivo }) => {
      if (!activityId.trim()) return invalidResult("ID de actividad inválido.");

      // Pendiente o en espera: no ocupaba cupo, se retira sin motivo
      if (estado !== "aceptada") return conRecarga(participationsApi.retirarse(activityId, null));

      // El backend vuelve a revisar el plazo con su reloj
      if (retiroFueraDePlazo(fechaActividad)) return fueraDePlazoResult();
      const motivoLimpio = motivo?.trim() ?? "";
      const error = validarMotivoRetiro(motivoLimpio);
      if (error) return invalidResult(error);
      return conRecarga(participationsApi.retirarse(activityId, motivoLimpio));
    };

    const aceptarSolicitud: Ctx["aceptarSolicitud"] = async (activityId, participanteId) => {
      if (!activityId.trim() || !participanteId.trim()) return invalidResult("Solicitud inválida.");
      return conRecarga(participationsApi.aceptarSolicitud(activityId, participanteId));
    };

    const rechazarSolicitud: Ctx["rechazarSolicitud"] = async (activityId, participanteId) => {
      if (!activityId.trim() || !participanteId.trim()) return invalidResult("Solicitud inválida.");
      return conRecarga(participationsApi.rechazarSolicitud(activityId, participanteId));
    };

    return {
      getMyParticipations,
      join,
      retiroFueraDePlazo,
      retirarse,
      aceptarSolicitud,
      rechazarSolicitud,
    };
  }, [refresh]);

  return (
    <ParticipationsContext.Provider value={value}>{children}</ParticipationsContext.Provider>
  );
}
