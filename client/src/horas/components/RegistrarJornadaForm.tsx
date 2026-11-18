import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useHoras } from "@/horas/hooks/useHoras";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import type { ParticipanteAceptado } from "@/horas/context/horasTypes";
import { diaEnBolivia, hoyEnBolivia } from "@/horas/utils/formato";
import { appToast } from "@/shared/components/Toast";

type RegistrarJornadaFormProps = {
  activityId: string;
  activityDate: string;
  participantes: ParticipanteAceptado[];
};

/**
 * La organización elige el día de la jornada y escribe las horas de cada
 * participante aceptado. Quien quede en blanco no se registra en esa jornada.
 */
export function RegistrarJornadaForm({ activityId, activityDate, participantes }: RegistrarJornadaFormProps) {
  const { registrarJornada } = useHoras();
  const { track, trackRechazo } = useAnalitica();
  const primerDia = diaEnBolivia(activityDate);
  const hoy = hoyEnBolivia();
  const [jornada, setJornada] = useState(primerDia);
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const registrar = (e: React.FormEvent) => {
    e.preventDefault();
    const registros = Object.entries(horas)
      .filter(([, valor]) => valor.trim() !== "")
      .map(([userId, valor]) => ({ userId, horas: Number(valor.replace(",", ".")) }));

    startTransition(async () => {
      const res = await registrarJornada(activityId, jornada, registros);
      if (!res.ok) {
        trackRechazo("horas", res);
        setError(res.errors?.[0] ?? "No se pudo registrar la jornada.");
        return;
      }
      // Cuántos participantes, no quiénes ni cuántas horas
      track("horas_registradas", { participantes: registros.length });
      appToast.success("Jornada registrada. Cada voluntario debe aceptar sus horas.");
      setHoras({});
      setError(null);
    });
  };

  return (
    <form
      onSubmit={registrar}
      aria-label="Registrar jornada"
      className="rounded-2xl border border-borde-suave bg-superficie/60 p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-texto">
        <CalendarPlus className="w-5 h-5 text-accion" aria-hidden="true" />
        <h3 className="text-base font-bold">Registrar jornada</h3>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fecha-jornada" className="block text-sm font-semibold text-texto">
          Fecha de la jornada
        </label>
        <input
          id="fecha-jornada"
          type="date"
          required
          min={primerDia}
          max={hoy}
          value={jornada}
          onChange={(e) => setJornada(e.target.value)}
          className="w-full sm:w-56 h-11 text-sm text-texto border border-borde-fuerte rounded-xl px-3.5 bg-fondo focus:ring-2 focus:ring-accion focus:border-transparent focus:outline-none"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-texto mb-1">
          Horas de cada participante
        </legend>
        <p className="text-xs text-texto-tenue">Deja en blanco a quien no fue a esta jornada.</p>
        {participantes.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-fondo border border-borde-suave px-3 py-2">
            <label htmlFor={`horas-${p.id}`} className="text-sm text-texto truncate">
              Horas de {p.name}
            </label>
            <input
              id={`horas-${p.id}`}
              type="number"
              inputMode="decimal"
              min={0.5}
              max={24}
              step={0.5}
              placeholder="0"
              value={horas[p.id] ?? ""}
              onChange={(e) => {
                setHoras((prev) => ({ ...prev, [p.id]: e.target.value }));
                if (error) setError(null);
              }}
              className="w-24 h-10 text-sm text-right text-texto border border-borde-fuerte rounded-lg px-2.5 focus:ring-2 focus:ring-accion focus:border-transparent focus:outline-none"
            />
          </div>
        ))}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm font-medium text-error-fuerte">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto h-11 px-6 rounded-xl bg-accion hover:bg-accion-hover text-sobre-accion font-semibold cursor-pointer"
      >
        {isPending ? (
          <>
            <Spinner className="size-4 mr-2" />
            <span>Registrando...</span>
          </>
        ) : (
          "Registrar jornada"
        )}
      </Button>
    </form>
  );
}
