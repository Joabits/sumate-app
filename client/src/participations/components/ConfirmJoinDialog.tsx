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
import { CheckCircle2, ListOrdered } from "lucide-react";

type ConfirmJoinDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  activityName?: string;
  /** true cuando los cupos están llenos y la persona entra a la lista de espera */
  listaDeEspera?: boolean;
};

export function ConfirmJoinDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isPending,
  activityName,
  listaDeEspera = false,
}: ConfirmJoinDialogProps) {
  if (listaDeEspera) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700 mb-1">
              <ListOrdered className="h-7 w-7" />
            </div>
            <AlertDialogTitle>Unirme a la lista de espera</AlertDialogTitle>
            <AlertDialogDescription>
              Los cupos{activityName ? <> de <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span></> : null} están
              llenos. Quedarás en la lista de espera y, si alguien cancela, entrarás en orden de llegada.
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
              className="w-full h-11 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold shadow-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  <span>Enviando...</span>
                </>
              ) : (
                "Sí, unirme a la lista"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <AlertDialogTitle>Solicitar participar</AlertDialogTitle>
          <AlertDialogDescription>
            {activityName ? (
              <>
                ¿Deseas enviar tu solicitud para participar como voluntario en{" "}
                <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>?
                El organizador la revisará y tu plaza quedará reservada cuando la acepte.
              </>
            ) : (
              "¿Deseas enviar tu solicitud para participar como voluntario en esta actividad? El organizador la revisará y tu plaza quedará reservada cuando la acepte."
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
                <span>Enviando...</span>
              </>
            ) : (
              "Enviar solicitud"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
