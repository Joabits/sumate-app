import { Ban } from "lucide-react";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";

/** Todos los que abren una actividad cancelada ven el aviso y el motivo. */
export function AvisoCancelacion() {
  const { activity } = useActivityDetail();
  if (activity.status !== "cancelled") {
    return null;
  }

  return (
    <section
      className="mb-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5"
      data-purpose="aviso-cancelacion"
    >
      <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div>
        <h2 className="text-sm font-bold text-rose-800">
          Actividad cancelada por la organización
        </h2>
        {activity.motivoCancelacion && (
          <p className="mt-1 text-sm text-rose-900">
            <span className="font-semibold">Motivo:</span> {activity.motivoCancelacion}
          </p>
        )}
        <p className="mt-1 text-xs text-rose-800">
          Ya no recibe solicitudes y las que tenía quedaron canceladas.
        </p>
      </div>
    </section>
  );
}
