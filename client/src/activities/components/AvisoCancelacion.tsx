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
      className="mb-5 flex gap-3 rounded-2xl border border-error-borde bg-error-suave px-4 py-3.5"
      data-purpose="aviso-cancelacion"
    >
      <Ban className="w-5 h-5 text-error shrink-0 mt-0.5" />
      <div>
        <h2 className="text-sm font-bold text-error-fuerte">
          Actividad cancelada por la organización
        </h2>
        {activity.motivoCancelacion && (
          <p className="mt-1 text-sm text-error-fuerte">
            <span className="font-semibold">Motivo:</span> {activity.motivoCancelacion}
          </p>
        )}
        <p className="mt-1 text-xs text-error-fuerte">
          Ya no recibe solicitudes y las que tenía quedaron canceladas.
        </p>
      </div>
    </section>
  );
}
