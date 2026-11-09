import { CheckCircle2, Clock, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOMBRE_ESTADO_HORAS, type EstadoHoras } from "@/horas/context/horasTypes";

const ESTILO: Record<EstadoHoras, { className: string; Icono: typeof Clock }> = {
  pendiente: { className: "bg-amber-50 text-amber-700 border-amber-200", Icono: Clock },
  confirmada: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icono: CheckCircle2 },
  reclamada: { className: "bg-rose-50 text-rose-700 border-rose-200", Icono: MessageSquareWarning },
};

/** Etiqueta con el estado de las horas (texto + ícono, no solo color). */
export function EstadoHorasBadge({ estado }: { estado: EstadoHoras }) {
  const { className, Icono } = ESTILO[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      <Icono className="w-3.5 h-3.5" aria-hidden="true" />
      {NOMBRE_ESTADO_HORAS[estado]}
    </span>
  );
}
