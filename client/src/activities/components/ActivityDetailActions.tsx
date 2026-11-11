import { useState, useTransition } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  ListOrdered,
  Loader2,
  Lock,
  Rocket,
  RotateCcw,
  UserMinus,
  XCircle,
} from "lucide-react";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import { appToast } from "@/shared/components/Toast";
import { ConfirmJoinDialog } from "@/participations/components/ConfirmJoinDialog";
import { ConfirmLeaveDialog } from "@/participations/components/ConfirmLeaveDialog";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";
import { useActivities } from "@/activities/hooks/useActivities";
import { useParticipations } from "@/participations/hooks/useParticipations";

export function ActivityDetailActions() {
  const { activity } = useActivityDetail();
  const { close, publish, reopen } = useActivities();
  const { join, leave } = useParticipations();
  const { track } = useAnalitica();
  const {
    id: activityId,
    name: activityName,
    status,
    isOwner,
    isParticipating,
    estadoSolicitud,
    posicionEnEspera,
    detail,
  } = activity;
  const solicitudPendiente = estadoSolicitud === "pendiente";
  const solicitudRechazada = estadoSolicitud === "rechazada";
  const enListaDeEspera = estadoSolicitud === "en_espera";
  const hasLocation = Boolean(
    detail?.latitude != null && detail?.longitude != null,
  );
  const hasDescription = Boolean(detail?.description?.trim());
  const hasCauses = Boolean(activity.causes && activity.causes.length > 0);
  // Hora en que se abrió la pantalla, para saber si la actividad ya pasó
  const [now] = useState(() => Date.now());
  const isPast = Boolean(
    activity.date && new Date(activity.date).getTime() <= now,
  );
  const isFull = (activity.participants?.length ?? 0) >= activity.capacity;
  const [isPending, startTransition] = useTransition();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Empieza la postulación: se abre la confirmación
  const abrirPostulacion = () => {
    track("postulacion_iniciada", { lista_de_espera: isFull });
    setJoinDialogOpen(true);
  };

  const handleConfirmJoin = () => {
    // Si los cupos están llenos, la solicitud entra a la lista de espera
    const aListaDeEspera = isFull;
    startTransition(async () => {
      const res = await join(activityId);
      if (!res.ok) {
        appToast.error(
          "Error al enviar la solicitud",
          res.errors?.[0] ?? "No se pudo registrar tu solicitud.",
        );
        return;
      }
      // Solo llega aquí si la solicitud se guardó
      track("postulacion_enviada", { lista_de_espera: aListaDeEspera });
      setJoinDialogOpen(false);
      appToast.success(
        aListaDeEspera
          ? "Te uniste a la lista de espera."
          : "¡Solicitud enviada! El organizador la revisará pronto.",
      );
    });
  };

  const handleConfirmLeave = () => {
    startTransition(async () => {
      const res = await leave(activityId);
      if (!res.ok) {
        appToast.error(
          "Error al cancelar participación",
          res.errors?.[0] ?? "No se pudo cancelar tu participación.",
        );
        return;
      }
      setLeaveDialogOpen(false);
      appToast.success(
        enListaDeEspera
          ? "Saliste de la lista de espera."
          : solicitudPendiente
            ? "Has cancelado tu solicitud de participación."
            : "Has cancelado tu confirmación de asistencia.",
      );
    });
  };

  const handlePublish = () => {
    if (!hasLocation || !hasDescription || !hasCauses) {
      const missing = [];
      if (!hasLocation) missing.push("ubicación en el mapa");
      if (!hasDescription) missing.push("descripción");
      if (!hasCauses) missing.push("al menos una causa temática");
      appToast.error(
        "Requisitos incompletos",
        `Para publicar la actividad debes registrar: ${missing.join(", ")}.`,
      );
      return;
    }

    startTransition(async () => {
      const res = await publish(activityId);
      if (!res.ok) {
        appToast.error(
          "Error al publicar",
          res.errors?.[0] ?? "No se pudo publicar la actividad.",
        );
        return;
      }
      appToast.success(
        "¡Actividad publicada con éxito!",
      );
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      const res = await close(activityId);
      if (!res.ok) {
        appToast.error(
          "Error al cerrar",
          res.errors?.[0] ?? "No se pudo cerrar la convocatoria.",
        );
        return;
      }
      appToast.success("Convocatoria cerrada exitosamente.");
    });
  };

  const handleReopen = () => {
    if (isPast) {
      appToast.error(
        "No se puede reabrir",
        "La fecha de la actividad ya ha transcurrido.",
      );
      return;
    }

    startTransition(async () => {
      const res = await reopen(activityId);
      if (!res.ok) {
        appToast.error(
          "Error al reabrir",
          res.errors?.[0] ?? "No se pudo reabrir la convocatoria.",
        );
        return;
      }
      appToast.success("Convocatoria reabierta exitosamente.");
    });
  };

  if (isPast) {
    return null;
  }

  if (status === "cancelled") {
    return (
      <div className="fixed bottom-6 inset-x-0 pointer-events-none z-40">
        <div className="w-full max-w-md lg:max-w-6xl mx-auto px-5 lg:px-8 flex justify-end">
          <button
            type="button"
            disabled
            className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-slate-300 text-slate-700 font-semibold text-sm cursor-not-allowed shadow-sm"
          >
            <Ban className="w-4 h-4" />
            <span>Actividad cancelada</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-6 inset-x-0 pointer-events-none z-40">
        <div className="w-full max-w-md lg:max-w-6xl mx-auto px-5 lg:px-8 flex justify-end">
          {!isOwner ? (
            isPast ? (
              isParticipating ? (
                <button
                  type="button"
                  disabled
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-slate-300 text-slate-600 font-semibold text-sm cursor-not-allowed shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-current" />
                  <span>Asististe</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-slate-300 text-slate-600 font-semibold text-sm cursor-not-allowed shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Actividad finalizada</span>
                </button>
              )
            ) : status === "active" ? (
              isParticipating ? (
                <button
                  type="button"
                  onClick={() => setLeaveDialogOpen(true)}
                  disabled={isPending}
                  aria-label="Cancelar participación en el evento"
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <UserMinus className="w-5 h-5 stroke-current" />
                  <span>Cancelar participación</span>
                </button>
              ) : solicitudPendiente ? (
                <button
                  type="button"
                  onClick={() => setLeaveDialogOpen(true)}
                  disabled={isPending}
                  aria-label="Solicitud pendiente. Pulsa para cancelar la solicitud"
                  title="Pulsa para cancelar tu solicitud"
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Clock className="w-5 h-5 stroke-current" />
                  <span>Solicitud pendiente</span>
                </button>
              ) : enListaDeEspera ? (
                <button
                  type="button"
                  onClick={() => setLeaveDialogOpen(true)}
                  disabled={isPending}
                  aria-label={`En lista de espera, puesto ${posicionEnEspera ?? ""}. Pulsa para salir de la lista`}
                  title="Pulsa para salir de la lista de espera"
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-sky-700/25 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-700 cursor-pointer bg-sky-700 hover:bg-sky-800 text-white"
                >
                  <ListOrdered className="w-5 h-5 stroke-current" />
                  <span>En lista de espera, puesto {posicionEnEspera}</span>
                </button>
              ) : solicitudRechazada ? (
                <button
                  type="button"
                  disabled
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-slate-300 text-slate-600 font-semibold text-sm cursor-not-allowed shadow-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Solicitud rechazada</span>
                </button>
              ) : isFull ? (
                <button
                  type="button"
                  onClick={abrirPostulacion}
                  disabled={isPending}
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-sky-700/25 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-700 cursor-pointer bg-sky-700 hover:bg-sky-800 text-white"
                >
                  <ListOrdered className="w-5 h-5 stroke-current" />
                  <span>Unirme a la lista de espera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={abrirPostulacion}
                  disabled={isPending}
                  aria-label="Solicitar participar en el evento"
                  className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-[#6355de]/35 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6355de] cursor-pointer bg-[#6355de] hover:bg-[#5244cc] text-white"
                >
                  <Check className="w-5 h-5 stroke-current" />
                  <span>Solicitar participar</span>
                </button>
              )
            ) : (
              <button
                type="button"
                disabled
                className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-slate-300 text-slate-600 font-semibold text-sm cursor-not-allowed shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>Convocatoria cerrada</span>
              </button>
            )
          ) : status === "draft" ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              aria-label="Publicar actividad"
              className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#6355de] text-white shadow-lg shadow-[#6355de]/35 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6355de] font-semibold text-sm disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Publicar actividad</span>
                </>
              )}
            </button>
          ) : status === "active" ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              aria-label="Cerrar convocatoria"
              className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/35 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-600 font-semibold text-sm disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Cerrando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Cerrar convocatoria</span>
                </>
              )}
            </button>
          ) : isPast ? (
            <button
              type="button"
              disabled
              className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-slate-300 text-slate-600 font-semibold text-sm cursor-not-allowed shadow-sm"
            >
              <Lock className="w-4 h-4" />
              <span>Evento finalizado (Cerrado)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              disabled={isPending}
              aria-label="Reabrir convocatoria"
              className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/35 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 font-semibold text-sm disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Reabriendo...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Reabrir convocatoria</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <ConfirmJoinDialog
        isOpen={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onConfirm={handleConfirmJoin}
        isPending={isPending}
        activityName={activityName}
        listaDeEspera={isFull}
      />
      <ConfirmLeaveDialog
        isOpen={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onConfirm={handleConfirmLeave}
        isPending={isPending}
        activityName={activityName}
        esSolicitud={solicitudPendiente}
        enListaDeEspera={enListaDeEspera}
      />
    </>
  );
}
