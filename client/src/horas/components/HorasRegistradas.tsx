import type { ReactNode } from "react";
import type { RegistroHoras } from "@/horas/context/horasTypes";
import { formatoHoras } from "@/horas/utils/formato";
import { EstadoHorasBadge } from "./EstadoHorasBadge";

/** Horas de un registro: si se corrigieron, muestra "antes 3 h → 5 h". */
export function HorasConCorreccion({ registro }: { registro: RegistroHoras }) {
  return (
    <span className="text-sm text-slate-900">
      {registro.horasAnteriores !== null && (
        <span className="text-slate-400 line-through mr-1.5">
          {formatoHoras(registro.horasAnteriores)}
        </span>
      )}
      <span className="font-bold">{formatoHoras(registro.horas)}</span>
      {registro.horasAnteriores !== null && (
        <span className="ml-1.5 text-xs font-medium text-indigo-600">corregidas</span>
      )}
    </span>
  );
}

type FilaHorasProps = {
  registro: RegistroHoras;
  /** Nombre o fecha que encabeza la fila */
  titulo: ReactNode;
  etiqueta: string;
  acciones?: ReactNode;
};

/** Una fila con las horas de una persona en una jornada, su estado y el reclamo si lo hay. */
export function FilaHoras({ registro, titulo, etiqueta, acciones }: FilaHorasProps) {
  return (
    <li
      aria-label={etiqueta}
      className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{titulo}</div>
          <HorasConCorreccion registro={registro} />
        </div>
        <EstadoHorasBadge estado={registro.estado} />
      </div>

      {registro.motivoReclamo && registro.estado === "reclamada" && (
        <p className="rounded-xl bg-rose-50/70 px-3 py-2 text-xs text-rose-800">
          <span className="font-semibold">Reclamo: </span>
          {registro.motivoReclamo}
        </p>
      )}

      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </li>
  );
}
