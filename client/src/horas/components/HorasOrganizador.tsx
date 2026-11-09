import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { HorasActividad, RegistroHoras } from "@/horas/context/horasTypes";
import { formatoJornada } from "@/horas/utils/formato";
import { CorregirHorasDialog } from "./CorregirHorasDialog";
import { FilaHoras } from "./HorasRegistradas";
import { RegistrarJornadaForm } from "./RegistrarJornadaForm";

type HorasOrganizadorProps = {
  horas: HorasActividad;
  activityDate: string;
};

/** La organización registra jornadas, ve las respuestas y corrige si hay reclamos. */
export function HorasOrganizador({ horas, activityDate }: HorasOrganizadorProps) {
  const [corrigiendo, setCorrigiendo] = useState<RegistroHoras | null>(null);

  // Registros agrupados por jornada, en orden de fecha
  const jornadas = new Map<string, RegistroHoras[]>();
  for (const registro of horas.registros) {
    jornadas.set(registro.jornada, [...(jornadas.get(registro.jornada) ?? []), registro]);
  }
  const reclamos = horas.registros.filter((r) => r.estado === "reclamada").length;

  return (
    <div className="space-y-5">
      {horas.puedeRegistrar &&
        (horas.participantesAceptados.length > 0 ? (
          <RegistrarJornadaForm
            activityId={horas.activityId}
            activityDate={activityDate}
            participantes={horas.participantesAceptados}
          />
        ) : (
          <p className="text-sm text-slate-500">
            No hubo participantes aceptados, así que no hay horas que registrar.
          </p>
        ))}

      {reclamos > 0 && (
        <p role="status" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
          {reclamos === 1 ? "Hay 1 reclamo" : `Hay ${reclamos} reclamos`} por revisar. Corrige las horas para que el voluntario las acepte.
        </p>
      )}

      {[...jornadas.entries()].map(([jornada, registros]) => (
        <section key={jornada} aria-label={`Jornada del ${formatoJornada(jornada)}`} className="space-y-2">
          <h3 className="text-sm font-bold text-slate-700">{formatoJornada(jornada)}</h3>
          <ul className="space-y-2">
            {registros.map((registro) => (
              <FilaHoras
                key={registro.id}
                registro={registro}
                titulo={registro.userName}
                etiqueta={`${registro.userName}, ${formatoJornada(jornada)}`}
                acciones={
                  registro.estado !== "confirmada" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCorrigiendo(registro)}
                      className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Corregir horas
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        </section>
      ))}

      {corrigiendo && (
        <CorregirHorasDialog
          key={corrigiendo.id}
          registro={corrigiendo}
          isOpen
          onOpenChange={(open) => !open && setCorrigiendo(null)}
        />
      )}
    </div>
  );
}
