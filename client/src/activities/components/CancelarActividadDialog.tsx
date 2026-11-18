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
import { appToast } from "@/shared/components/Toast";
import { useActivities } from "@/activities/hooks/useActivities";

type CancelarActividadDialogProps = {
  activityId: string;
  activityName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAXIMO_MOTIVO = 500;

/**
 * La organización cancela una actividad publicada. El motivo es obligatorio
 * porque cada voluntario afectado lo verá en Mis solicitudes.
 */
export function CancelarActividadDialog({
  activityId,
  activityName,
  isOpen,
  onOpenChange,
}: CancelarActividadDialogProps) {
  const { cancelar } = useActivities();
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
      const res = await cancelar(activityId, motivo);
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-suave text-error mb-1">
            <Ban className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Cancelar actividad</AlertDialogTitle>
          <AlertDialogDescription>
            Las solicitudes pendientes, las personas aceptadas y la lista de espera de{" "}
            <span className="font-semibold text-texto">&ldquo;{activityName}&rdquo;</span>{" "}
            pasarán a canceladas. Cada voluntario verá el motivo. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label
            htmlFor="motivo-cancelacion"
            className="text-sm font-semibold text-texto"
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
            className="w-full text-sm text-texto border border-borde-fuerte rounded-xl px-3.5 py-2.5 resize-none focus:ring-2 focus:ring-error focus:border-transparent focus:outline-none placeholder:text-texto-tenue"
          />
          {error && (
            <p
              id="error-motivo-cancelacion"
              role="alert"
              className="text-xs font-medium text-error-fuerte"
            >
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
            variant="destructive"
            disabled={isPending}
            onClick={confirmar}
            className="w-full h-11 rounded-xl bg-error hover:bg-error-fuerte text-sobre-accion font-semibold shadow-xs cursor-pointer"
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
