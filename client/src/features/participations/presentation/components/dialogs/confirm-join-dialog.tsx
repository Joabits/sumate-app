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
import { CheckCircle2 } from "lucide-react";

type ConfirmJoinDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  activityName?: string;
};

export function ConfirmJoinDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
  activityName,
}: ConfirmJoinDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Confirmar asistencia</AlertDialogTitle>
          <AlertDialogDescription>
            {activityName ? (
              <>
                ¿Deseas confirmar tu participación como voluntario en{" "}
                <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>?
                Al confirmar, se reservará tu plaza de inmediato.
              </>
            ) : (
              "¿Deseas confirmar tu participación como voluntario en esta actividad? Al confirmar, se reservará tu plaza de inmediato."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                <span>Confirmando...</span>
              </>
            ) : (
              "Confirmar asistencia"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
