"use client";

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
import { AlertCircle } from "lucide-react";

type ConfirmLeaveDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  activityName?: string;
  /** true cuando lo que se cancela es una solicitud aún pendiente */
  esSolicitud?: boolean;
  /** true cuando la persona sale de la lista de espera */
  enListaDeEspera?: boolean;
};

export function ConfirmLeaveDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
  activityName,
  esSolicitud = false,
  enListaDeEspera = false,
}: ConfirmLeaveDialogProps) {
  const sujeto = enListaDeEspera
    ? "tu lugar en la lista de espera"
    : esSolicitud
      ? "tu solicitud de participación"
      : "tu participación";
  const consecuencia = enListaDeEspera
    ? "Perderás tu puesto y las personas detrás de ti avanzarán."
    : esSolicitud
      ? "El organizador ya no la verá en su lista de solicitudes."
      : "Tu cupo quedará libre y, si hay lista de espera, entrará la primera persona.";

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-1">
            <AlertCircle className="h-7 w-7" />
          </div>
          <AlertDialogTitle>
            {enListaDeEspera
              ? "Salir de la lista de espera"
              : esSolicitud
                ? "Cancelar solicitud"
                : "Cancelar participación"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activityName ? (
              <>
                ¿Estás seguro de que deseas cancelar {sujeto} en{" "}
                <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>?{" "}
                {consecuencia}
              </>
            ) : (
              `¿Estás seguro de que deseas cancelar ${sujeto}? ${consecuencia}`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
          >
            {enListaDeEspera
              ? "Mantener mi puesto"
              : esSolicitud
                ? "Mantener mi solicitud"
                : "Mantener mi lugar"}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
            className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                <span>Cancelando...</span>
              </>
            ) : enListaDeEspera ? (
              "Sí, salir de la lista"
            ) : esSolicitud ? (
              "Sí, cancelar solicitud"
            ) : (
              "Sí, cancelar participación"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
