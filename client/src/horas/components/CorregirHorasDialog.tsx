import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useHoras } from "@/horas/hooks/useHoras";
import type { RegistroHoras } from "@/horas/context/horasTypes";
import { formatoHoras, formatoJornada } from "@/horas/utils/formato";
import { appToast } from "@/shared/components/Toast";

type CorregirHorasDialogProps = {
  registro: RegistroHoras;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/** La organización corrige las horas; el voluntario tendrá que aceptarlas otra vez. */
export function CorregirHorasDialog({ registro, isOpen, onOpenChange }: CorregirHorasDialogProps) {
  const { corregir } = useHoras();
  const [horas, setHoras] = useState(String(registro.horas));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cambiarApertura = (open: boolean) => {
    if (!open) {
      setHoras(String(registro.horas));
      setError(null);
    }
    onOpenChange(open);
  };

  const guardar = () => {
    const valor = Number(horas.replace(",", "."));
    startTransition(async () => {
      const res = await corregir(registro.id, valor);
      if (!res.ok) {
        setError(res.errors?.[0] ?? "No se pudieron corregir las horas.");
        return;
      }
      appToast.success(`Horas corregidas. ${registro.userName} debe aceptarlas de nuevo.`);
      cambiarApertura(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accion-suave text-accion mb-1">
            <PencilLine className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Corregir horas</AlertDialogTitle>
          <AlertDialogDescription>
            {registro.userName}, {formatoJornada(registro.jornada)}. Ahora figuran{" "}
            <span className="font-semibold text-texto">{formatoHoras(registro.horas)}</span>.
            Al corregir, las horas vuelven a quedar pendientes hasta que las acepte.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {registro.motivoReclamo && registro.estado === "reclamada" && (
          <p className="rounded-xl bg-error-suave/70 px-3 py-2 text-sm text-error-fuerte">
            <span className="font-semibold">Reclamo: </span>
            {registro.motivoReclamo}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="horas-corregidas" className="text-sm font-semibold text-texto">
            Horas correctas
          </label>
          <input
            id="horas-corregidas"
            type="number"
            inputMode="decimal"
            min={0.5}
            max={24}
            step={0.5}
            value={horas}
            onChange={(e) => {
              setHoras(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "error-horas-corregidas" : undefined}
            className="w-full h-11 text-sm text-texto border border-borde-fuerte rounded-xl px-3.5 focus:ring-2 focus:ring-accion focus:border-transparent focus:outline-none"
          />
          {error && (
            <p id="error-horas-corregidas" role="alert" className="text-xs font-medium text-error-fuerte">
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-superficie-alta hover:bg-superficie-hover text-texto-secundario hover:text-texto border-none shadow-none font-medium cursor-pointer"
          >
            Volver
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isPending}
            onClick={guardar}
            className="w-full h-11 rounded-xl bg-accion hover:bg-accion-hover text-sobre-accion font-semibold shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                <span>Guardando...</span>
              </>
            ) : (
              "Guardar corrección"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
