import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHoras } from "@/horas/hooks/useHoras";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import type { HorasActividad, RegistroHoras } from "@/horas/context/horasTypes";
import { formatoJornada } from "@/horas/utils/formato";
import Link from "@/shared/components/Link";
import { appToast } from "@/shared/components/Toast";
import { FilaHoras } from "./HorasRegistradas";
import { ReclamarHorasDialog } from "./ReclamarHorasDialog";

/** El voluntario ve sus horas por jornada y las acepta o reclama. */
export function MisHoras({ horas }: { horas: HorasActividad }) {
  const { aceptar } = useHoras();
  const { track, trackRechazo } = useAnalitica();
  const [reclamando, setReclamando] = useState<RegistroHoras | null>(null);
  const [aceptando, setAceptando] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const aceptarHoras = (registro: RegistroHoras) => {
    setAceptando(registro.id);
    startTransition(async () => {
      const res = await aceptar(registro.id);
      setAceptando(null);
      if (!res.ok) {
        trackRechazo("horas", res);
        appToast.error("No se pudieron aceptar", res.errors?.[0] ?? "Inténtalo nuevamente.");
        return;
      }
      track("horas_respondidas", { respuesta: "aceptadas" });
      appToast.success("Horas confirmadas. Ya cuentan para tu constancia.");
    });
  };

  if (horas.registros.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        La organización todavía no registró tus horas de esta actividad.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {horas.registros.map((registro) => {
          const fecha = formatoJornada(registro.jornada);
          return (
            <FilaHoras
              key={registro.id}
              registro={registro}
              titulo={fecha}
              etiqueta={`Jornada del ${fecha}`}
              acciones={
                registro.estado === "pendiente" && (
                  <>
                    <Button
                      type="button"
                      disabled={aceptando === registro.id}
                      onClick={() => aceptarHoras(registro)}
                      className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      {aceptando === registro.id ? "Aceptando..." : "Aceptar horas"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReclamando(registro)}
                      className="h-9 rounded-xl text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer"
                    >
                      Reclamar
                    </Button>
                  </>
                )
              }
            />
          );
        })}
      </ul>

      {horas.registros.some((r) => r.estado === "reclamada") && (
        <p className="text-xs text-slate-500">
          Tu reclamo está en revisión. Si la organización corrige, verás las horas nuevas para aceptarlas.
        </p>
      )}

      <Link
        href="/constancia"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#6355DE] hover:underline"
      >
        <FileText className="w-4 h-4" aria-hidden="true" />
        Ver mi constancia
      </Link>

      {reclamando && (
        <ReclamarHorasDialog
          key={reclamando.id}
          registro={reclamando}
          isOpen
          onOpenChange={(open) => !open && setReclamando(null)}
        />
      )}
    </div>
  );
}
