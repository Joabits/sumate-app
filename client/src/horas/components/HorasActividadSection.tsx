import { useState } from "react";
import { Timer } from "lucide-react";
import { useActivities } from "@/activities/hooks/useActivities";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";
import { useHoras } from "@/horas/hooks/useHoras";
import { formatoHoras } from "@/horas/utils/formato";
import { usePageData } from "@/shared/hooks/usePageData";
import { HorasOrganizador } from "./HorasOrganizador";
import { MisHoras } from "./MisHoras";

/**
 * Sección "Horas de voluntariado" del detalle. Aparece cuando la actividad ya
 * terminó, para la organización y para los participantes aceptados.
 */
export function HorasActividadSection() {
  const { activity } = useActivityDetail();
  const { dataVersion } = useActivities();
  const { getHorasDeActividad } = useHoras();
  // Hora en que se abrió la pantalla, para saber si la actividad ya terminó
  const [now] = useState(() => Date.now());
  const terminada = new Date(activity.date).getTime() <= now;
  const visible =
    terminada &&
    activity.status !== "cancelled" &&
    (activity.isOwner || activity.estadoSolicitud === "aceptada");

  const { data: horas, error } = usePageData(
    () => (visible ? getHorasDeActividad(activity.id) : Promise.resolve(null)),
    [activity.id, visible, dataVersion],
  );

  if (!visible) return null;

  return (
    <section aria-labelledby="titulo-horas" className="mt-8 pt-6 border-t border-slate-100 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-[#6355DE]" aria-hidden="true" />
          <h2 id="titulo-horas" className="text-lg font-extrabold text-slate-900">
            Horas de voluntariado
          </h2>
        </div>
        {horas && !horas.esOrganizador && (
          <p className="text-sm text-slate-600">
            Total confirmado:{" "}
            <span className="font-bold text-slate-900">{formatoHoras(horas.totalConfirmado)}</span>
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error.message}
        </p>
      )}
      {!horas && !error && <p className="text-sm text-slate-500">Cargando horas...</p>}
      {horas &&
        (horas.esOrganizador ? (
          <HorasOrganizador horas={horas} activityDate={activity.date} />
        ) : (
          <MisHoras horas={horas} />
        ))}
    </section>
  );
}
