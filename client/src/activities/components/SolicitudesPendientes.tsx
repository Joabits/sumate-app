import { useState, useTransition } from "react";
import Image from "@/shared/components/Image";
import { Check, Clock, Loader2, X } from "lucide-react";
import { appToast } from "@/shared/components/Toast";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";
import { useParticipations } from "@/participations/hooks/useParticipations";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";

type Decision = "aceptar" | "rechazar";

/**
 * Lista de solicitudes pendientes. Solo la ve el organizador de la actividad,
 * que decide si acepta o rechaza a cada voluntario.
 */
export function SolicitudesPendientes() {
  const { activity } = useActivityDetail();
  const { aceptarSolicitud, rechazarSolicitud } = useParticipations();
  const { track, trackRechazo } = useAnalitica();
  const solicitudes = activity.solicitudesPendientes ?? [];
  const aceptados = activity.participants?.length ?? 0;
  const cuposLlenos = aceptados >= activity.capacity;
  const [enProceso, startTransition] = useTransition();
  const [ocupado, setOcupado] = useState<{ id: string; decision: Decision } | null>(null);

  if (!activity.isOwner || solicitudes.length === 0) {
    return null;
  }

  const manejarDecision = (participanteId: string, nombre: string, decision: Decision) => {
    setOcupado({ id: participanteId, decision });
    startTransition(async () => {
      const res =
        decision === "aceptar"
          ? await aceptarSolicitud(activity.id, participanteId)
          : await rechazarSolicitud(activity.id, participanteId);
      setOcupado(null);
      if (!res.ok) {
        if (decision === "aceptar") trackRechazo("postulacion", res);
        appToast.error(
          decision === "aceptar" ? "No se pudo aceptar" : "No se pudo rechazar",
          res.errors?.[0] ?? "Inténtalo nuevamente.",
        );
        return;
      }
      // Último paso del embudo de la postulación: el organizador la aceptó
      if (decision === "aceptar") track("solicitud_aceptada", {});
      appToast.success(
        decision === "aceptar"
          ? `Aceptaste a ${nombre}. Ya ocupa un cupo.`
          : `Rechazaste la solicitud de ${nombre}.`,
      );
    });
  };

  return (
    <section
      className="mt-6 pt-5 border-t border-borde-suave"
      data-purpose="solicitudes-pendientes"
      aria-labelledby="titulo-solicitudes-pendientes"
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          id="titulo-solicitudes-pendientes"
          className="text-xs font-semibold tracking-wider text-texto-tenue uppercase"
        >
          Solicitudes pendientes
        </h3>
        <span className="text-[11px] font-semibold bg-aviso-suave text-aviso-fuerte px-2.5 py-0.5 rounded-full">
          {solicitudes.length}
        </span>
      </div>

      {cuposLlenos && (
        <p className="mb-3 text-xs text-error-fuerte bg-error-suave border border-error-suave rounded-xl px-3 py-2">
          Los cupos están completos. Para aceptar a alguien más, aumenta la capacidad de la actividad.
        </p>
      )}

      <ul className="space-y-2">
        {solicitudes.map((p) => {
          const inicial = (p.name || "U").charAt(0).toUpperCase();
          const estaOcupado = ocupado?.id === p.id;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-aviso-suave/60 border border-aviso-suave"
            >
              <div className="flex items-center gap-3 min-w-0">
                {p.image ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-superficie-alta shrink-0 border border-borde">
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-aviso-suave border border-aviso-borde flex items-center justify-center text-aviso-fuerte font-bold text-sm shrink-0">
                    {inicial}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-texto truncate">{p.name}</p>
                  <p className="text-xs text-aviso-fuerte flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Esperando tu respuesta
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => manejarDecision(p.id, p.name, "rechazar")}
                  disabled={enProceso}
                  aria-label={`Rechazar solicitud de ${p.name}`}
                  className="flex items-center gap-1 h-11 px-4 rounded-full bg-fondo border border-error-borde text-error hover:bg-error-suave text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {estaOcupado && ocupado?.decision === "rechazar" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>Rechazar</span>
                </button>
                <button
                  type="button"
                  onClick={() => manejarDecision(p.id, p.name, "aceptar")}
                  disabled={enProceso || cuposLlenos}
                  aria-label={`Aceptar solicitud de ${p.name}`}
                  className="flex items-center gap-1 h-11 px-4 rounded-full bg-exito hover:bg-exito-fuerte text-sobre-accion text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {estaOcupado && ocupado?.decision === "aceptar" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Aceptar</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
