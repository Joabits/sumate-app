import { ListOrdered } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";

type ListaDeEsperaProps = {
  activity: ActivityDetailData;
};

/**
 * Personas que solicitaron con los cupos llenos, en orden de llegada.
 * Solo la ve el organizador. Si alguien aceptado cancela, entra la primera.
 */
export function ListaDeEspera({ activity }: ListaDeEsperaProps) {
  const enEspera = activity.listaDeEspera ?? [];

  if (!activity.isOwner || enEspera.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-6 pt-5 border-t border-slate-100"
      data-purpose="lista-de-espera"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Lista de espera
        </h3>
        <span className="text-[11px] font-semibold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full">
          {enEspera.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Si alguien cancela, entra la primera persona de la lista.
      </p>

      <ol aria-label="Lista de espera" className="space-y-2">
        {enEspera.map((p, index) => (
          <li
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50/60 border border-sky-100"
          >
            <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-800 shrink-0">
              <ListOrdered className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-slate-900 truncate">
              {index + 1}. {p.name}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
