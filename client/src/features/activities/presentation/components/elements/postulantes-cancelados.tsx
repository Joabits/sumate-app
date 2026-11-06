import {
  NOMBRE_ESTADO_SOLICITUD,
  type ActivityDetailData,
} from "@/features/activities/domain/entities/activity.entity";

type PostulantesCanceladosProps = {
  activity: ActivityDetailData;
};

/**
 * Después de cancelar, la organización ve a quién afectó y en qué estado
 * estaba cada solicitud antes de la cancelación.
 */
export function PostulantesCancelados({ activity }: PostulantesCanceladosProps) {
  const afectados = activity.postulantesCancelados ?? [];

  if (!activity.isOwner || activity.status !== "cancelled" || afectados.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-6 pt-5 border-t border-slate-100"
      data-purpose="postulantes-cancelados"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Postulantes afectados
        </h3>
        <span className="text-[11px] font-semibold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
          {afectados.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Cada uno ve el motivo en Mis solicitudes. Así estaban al cancelar:
      </p>

      <ul aria-label="Postulantes afectados" className="space-y-2">
        {afectados.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
          >
            <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
            <span className="shrink-0 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
              Estaba: {p.estadoAnterior ? NOMBRE_ESTADO_SOLICITUD[p.estadoAnterior] : "Sin dato"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
