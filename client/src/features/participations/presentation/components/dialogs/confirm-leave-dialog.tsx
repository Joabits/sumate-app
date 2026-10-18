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
};

export function ConfirmLeaveDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
  activityName,
}: ConfirmLeaveDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-1">
            <AlertCircle className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Cancelar participación</AlertDialogTitle>
          <AlertDialogDescription>
            {activityName ? (
              <>
                ¿Estás seguro de que deseas cancelar tu participación en{" "}
                <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>?
                Tu cupo reservado quedará disponible para que otro voluntario pueda unirse.
              </>
            ) : (
              "¿Estás seguro de que deseas cancelar tu participación? Tu cupo reservado quedará disponible para que otro voluntario pueda unirse."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
          >
            Mantener mi lugar
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
            ) : (
              "Sí, cancelar participación"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
