"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
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
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { cancelarActividadAction } from "../../actions/activity.action";

type CancelarActividadDialogProps = {
  activityId: string;
  activityName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAXIMO_MOTIVO = 500;

/**
 * La organización cancela una actividad publicada. El motivo es obligatorio
 * porque cada voluntario afectado lo verá en Mi trayectoria.
 */
export function CancelarActividadDialog({
  activityId,
  activityName,
  isOpen,
  onOpenChange,
}: CancelarActividadDialogProps) {
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

  const confirmar = () => {
    if (!motivo.trim()) {
      setError("Escribe el motivo de la cancelación. Los voluntarios lo verán.");
      return;
    }

    startTransition(async () => {
      const res = await cancelarActividadAction(activityId, motivo);
      if (!res.ok) {
        setError(res.errors?.[0] ?? "No se pudo cancelar la actividad.");
        return;
      }
      appToast.success("Actividad cancelada. Los voluntarios verán el motivo.");
      cambiarApertura(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-1">
            <Ban className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Cancelar actividad</AlertDialogTitle>
          <AlertDialogDescription>
            Las solicitudes pendientes, las personas aceptadas y la lista de espera de{" "}
            <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>{" "}
            pasarán a canceladas. Cada voluntario verá el motivo. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label
            htmlFor="motivo-cancelacion"
            className="text-sm font-semibold text-slate-800"
          >
            Motivo de la cancelación
          </label>
          <textarea
            id="motivo-cancelacion"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (error) setError(null);
            }}
            maxLength={MAXIMO_MOTIVO}
            rows={3}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "error-motivo-cancelacion" : undefined}
            placeholder="Ej: Se suspende por lluvia; el parque estará cerrado."
            className="w-full text-sm text-slate-900 border border-slate-300 rounded-xl px-3.5 py-2.5 resize-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:outline-none placeholder:text-slate-400"
          />
          {error && (
            <p
              id="error-motivo-cancelacion"
              role="alert"
              className="text-xs font-medium text-rose-700"
            >
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
          >
            Volver
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={confirmar}
            className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                <span>Cancelando...</span>
              </>
            ) : (
              "Sí, cancelar actividad"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
