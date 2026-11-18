import { useState, useTransition } from "react";
import { MessageSquareWarning } from "lucide-react";
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
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import { Spinner } from "@/components/ui/spinner";
import { useHoras } from "@/horas/hooks/useHoras";
import type { RegistroHoras } from "@/horas/context/horasTypes";
import { formatoHoras, formatoJornada } from "@/horas/utils/formato";
import { appToast } from "@/shared/components/Toast";

const MAXIMO_MOTIVO = 500;

type ReclamarHorasDialogProps = {
  registro: RegistroHoras;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/** El voluntario no está de acuerdo con las horas y explica por qué. */
export function ReclamarHorasDialog({ registro, isOpen, onOpenChange }: ReclamarHorasDialogProps) {
  const { reclamar } = useHoras();
  const { track, trackRechazo } = useAnalitica();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cambiarApertura = (open: boolean) => {
    if (!open) {
      setMotivo("");
      setError(null);
    }
    onOpenChange(open);
  };

  const enviar = () => {
    if (!motivo.trim()) {
      track("accion_rechazada", { flujo: "horas", motivo: "validacion" });
      setError("Escribe el motivo del reclamo. La organización lo verá para corregir.");
      return;
    }
    startTransition(async () => {
      const res = await reclamar(registro.id, motivo);
      if (!res.ok) {
        trackRechazo("horas", res);
        setError(res.errors?.[0] ?? "No se pudo enviar el reclamo.");
        return;
      }
      // Sin el motivo: es texto escrito por la persona
      track("horas_respondidas", { respuesta: "reclamadas" });
      appToast.success("Reclamo enviado. La organización revisará tus horas.");
      cambiarApertura(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-suave text-error mb-1">
            <MessageSquareWarning className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Reclamar horas</AlertDialogTitle>
          <AlertDialogDescription>
            Te registraron <span className="font-semibold text-texto">{formatoHoras(registro.horas)}</span>{" "}
            el {formatoJornada(registro.jornada)}. Cuenta qué no está bien; si la organización
            corrige, tendrás que aceptar las horas nuevas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="motivo-reclamo" className="text-sm font-semibold text-texto">
            Motivo del reclamo
          </label>
          <textarea
            id="motivo-reclamo"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError(null);
            }}
            maxLength={MAXIMO_MOTIVO}
            rows={3}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "error-motivo-reclamo" : undefined}
            placeholder="Ej: Me quedé hasta las 18:00, fueron 5 horas."
            className="w-full text-sm text-texto border border-borde-fuerte rounded-xl px-3.5 py-2.5 resize-none focus:ring-2 focus:ring-error focus:border-transparent focus:outline-none placeholder:text-texto-tenue"
          />
          {error && (
            <p id="error-motivo-reclamo" role="alert" className="text-xs font-medium text-error-fuerte">
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
            onClick={enviar}
            className="w-full h-11 rounded-xl bg-error hover:bg-error-fuerte text-sobre-accion font-semibold shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                <span>Enviando...</span>
              </>
            ) : (
              "Enviar reclamo"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
