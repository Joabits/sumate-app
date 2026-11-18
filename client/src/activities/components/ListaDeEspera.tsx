import { ListOrdered } from "lucide-react";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";

/**
 * Personas que solicitaron con los cupos llenos, en orden de llegada.
 * Solo la ve el organizador. Si alguien aceptado cancela, entra la primera.
 */
export function ListaDeEspera() {
  const { activity } = useActivityDetail();
  const enEspera = activity.listaDeEspera ?? [];

  if (!activity.isOwner || enEspera.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-6 pt-5 border-t border-borde-suave"
      data-purpose="lista-de-espera"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold tracking-wider text-texto-tenue uppercase">
          Lista de espera
        </h3>
        <span className="text-[11px] font-semibold bg-info-suave text-info-fuerte px-2.5 py-0.5 rounded-full">
          {enEspera.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-texto-tenue">
        Si alguien cancela, entra la primera persona de la lista.
      </p>

      <ol aria-label="Lista de espera" className="space-y-2">
        {enEspera.map((p, index) => (
          <li
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-info-suave/60 border border-info-suave"
          >
            <div className="w-10 h-10 rounded-full bg-info-suave border border-info-borde flex items-center justify-center text-info-fuerte shrink-0">
              <ListOrdered className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-texto truncate">
              {index + 1}. {p.name}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
