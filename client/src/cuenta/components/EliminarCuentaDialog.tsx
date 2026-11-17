import { useState, useTransition } from "react";
import { useNavigate } from "react-router";
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
import { useCuenta } from "@/cuenta/hooks/useCuenta";
import type { MisDatos } from "@/cuenta/context/cuentaTypes";

type EliminarCuentaDialogProps = {
  datos: MisDatos;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

// Los dos botones tienen el mismo tamaño y el mismo peso: ninguno empuja al otro
const BOTON = "w-full h-11 rounded-xl text-sm font-semibold shadow-none cursor-pointer";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", {
    timeZone: "America/La_Paz",
    day: "numeric",
    month: "long",
  });

/**
 * Confirmación honesta para eliminar la cuenta (Tarea 10):
 * - dice qué se borra y qué se conserva (la regla de la app), sin culpa;
 * - un solo paso: no hay que escribir nada ni pasar por más pantallas;
 * - si la regla bloquea, dice por qué y qué hacer, sin botón de eliminar.
 */
export function EliminarCuentaDialog({ datos, isOpen, onOpenChange }: EliminarCuentaDialogProps) {
  const navigate = useNavigate();
  const { eliminarCuenta } = useCuenta();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bloqueada = datos.actividadesPorTerminar.length > 0;

  const cambiarApertura = (open: boolean) => {
    if (!open) setError(null);
    onOpenChange(open);
  };

  const confirmar = () => {
    startTransition(async () => {
      const res = await eliminarCuenta();
      if (!res.ok) {
        setError(res.errors[0]);
        return;
      }
      appToast.success("Tu cuenta fue eliminada.");
      navigate("/", { replace: true });
    });
  };

  if (bloqueada) {
    return (
      <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
        <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Todavía no puedes eliminar tu cuenta</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600 text-left">
                <p>
                  Organizas actividades que aún no terminaron y hay voluntarios que cuentan con
                  ellas:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {datos.actividadesPorTerminar.map((a) => (
                    <li key={a.id}>
                      <span className="font-semibold text-slate-900">{a.nombre}</span> ·{" "}
                      {fecha(a.fecha)}
                    </li>
                  ))}
                </ul>
                <p>
                  <span className="font-semibold text-slate-900">Qué hacer:</span> cancélalas desde
                  Mis actividades (los voluntarios verán el motivo) o espera a que terminen. Después
                  podrás eliminar tu cuenta desde aquí.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className={`${BOTON} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}>
              Cerrar
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => navigate("/my-activities")}
              className={`${BOTON} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}
            >
              Ir a Mis actividades
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar mi cuenta</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-slate-600 text-left">
              <p>Esto es lo que pasa si eliminas tu cuenta:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  Se borran tu nombre, tu correo, tu foto y tu acceso. No podrás volver a iniciar
                  sesión con esta cuenta.
                </li>
                <li>
                  Tus solicitudes pendientes y en lista de espera se retiran. Si tenías un cupo en
                  una actividad que todavía no pasa, se libera para la primera persona en espera.
                </li>
                <li>
                  Las horas que confirmaste se quedan en el registro de cada organización como
                  «Usuario eliminado», sin tus datos. Las horas sin confirmar se borran.
                </li>
                <li>No se puede deshacer. Si quieres guardar tus datos, descárgalos antes.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={isPending}
            className={`${BOTON} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`}
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isPending}
            onClick={confirmar}
            className={`${BOTON} bg-white border border-rose-300 text-rose-700 hover:bg-rose-50`}
          >
            {isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                <span>Eliminando...</span>
              </>
            ) : (
              "Eliminar mi cuenta"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
