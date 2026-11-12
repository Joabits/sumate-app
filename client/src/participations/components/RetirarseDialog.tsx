import { useState, useTransition } from "react";
import { AlertCircle, CalendarX2 } from "lucide-react";
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
import type { ApiError } from "@/api/apiResults";
import { useParticipations } from "@/participations/hooks/useParticipations";
import {
  MOTIVO_RETIRO_MAX,
  type EstadoRetirable,
  type Retiro,
} from "@/participations/context/participationsTypes";

type RetirarseDialogProps = {
  activityId: string;
  activityName: string;
  fechaActividad: string;
  /** Estado de la solicitud que se retira */
  estado: EstadoRetirable;
  /** Un aceptado al que le faltan menos de 24 horas: la app no deja retirarse */
  fueraDePlazo: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Después de guardarse el retiro */
  onRetirado?: (retiro: Retiro) => void;
  /** El retiro no se pudo hacer (plazo, motivo, permiso...) */
  onRechazado?: (error: ApiError) => void;
};

const TEXTOS: Record<
  EstadoRetirable,
  { titulo: string; pregunta: string; consecuencia: string; mantener: string; confirmar: string }
> = {
  aceptada: {
    titulo: "Retirarme de la actividad",
    pregunta: "¿Quieres retirarte de",
    consecuencia:
      "Tu cupo quedará libre y, si hay lista de espera, entrará la primera persona. La organización verá tu motivo.",
    mantener: "Mantener mi lugar",
    confirmar: "Sí, retirarme",
  },
  pendiente: {
    titulo: "Retirar mi solicitud",
    pregunta: "¿Quieres retirar tu solicitud para",
    consecuencia: "El organizador ya no la verá en su lista de solicitudes.",
    mantener: "Mantener mi solicitud",
    confirmar: "Sí, retirar solicitud",
  },
  en_espera: {
    titulo: "Salir de la lista de espera",
    pregunta: "¿Quieres salir de la lista de espera de",
    consecuencia: "Perderás tu puesto y las personas detrás de ti avanzarán.",
    mantener: "Mantener mi puesto",
    confirmar: "Sí, salir de la lista",
  },
};

function mensajeExito(retiro: Retiro): string {
  if (retiro.estadoAnterior === "pendiente") return "Retiraste tu solicitud.";
  if (retiro.estadoAnterior === "en_espera") return "Saliste de la lista de espera.";
  return retiro.entroDeListaDeEspera
    ? "Te retiraste. Tu cupo pasó a la primera persona de la lista de espera."
    : "Te retiraste. Tu cupo quedó libre.";
}

/**
 * Retirarse de una actividad (Tarea 9):
 * - un aceptado escribe el motivo y puede retirarse hasta 24 horas antes;
 * - un pendiente o en espera se retira sin motivo;
 * - fuera de plazo la app no permite retirarse.
 */
export function RetirarseDialog({
  activityId,
  activityName,
  fechaActividad,
  estado,
  fueraDePlazo,
  isOpen,
  onOpenChange,
  onRetirado,
  onRechazado,
}: RetirarseDialogProps) {
  const { retirarse } = useParticipations();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pideMotivo = estado === "aceptada";
  const textos = TEXTOS[estado];

  const cambiarApertura = (open: boolean) => {
    if (!open) {
      setMotivo("");
      setError(null);
    }
    onOpenChange(open);
  };

  const confirmar = () => {
    startTransition(async () => {
      const res = await retirarse(activityId, {
        estado,
        fechaActividad,
        motivo: pideMotivo ? motivo : undefined,
      });
      if (!res.ok) {
        onRechazado?.(res);
        setError(res.errors?.[0] ?? "No se pudo completar tu retiro.");
        return;
      }
      // Solo llega aquí si el retiro se guardó
      onRetirado?.(res.data);
      appToast.success(mensajeExito(res.data));
      cambiarApertura(false);
    });
  };

  if (fueraDePlazo) {
    return (
      <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
        <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-1">
              <CalendarX2 className="h-7 w-7" />
            </div>
            <AlertDialogTitle>Ya no puedes retirarte</AlertDialogTitle>
            <AlertDialogDescription>
              Faltan menos de 24 horas para{" "}
              <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>. Para
              que la organización pueda reemplazarte, los retiros se hacen hasta un día antes. Si no
              puedes asistir, avísale directamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white hover:text-white border-none shadow-none font-semibold cursor-pointer">
              Entendido
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={cambiarApertura}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-1">
            <AlertCircle className="h-7 w-7" />
          </div>
          <AlertDialogTitle>{textos.titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            {textos.pregunta}{" "}
            <span className="font-semibold text-slate-900">&ldquo;{activityName}&rdquo;</span>?{" "}
            {textos.consecuencia}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {pideMotivo && (
          <div className="space-y-1.5">
            <label htmlFor="motivo-retiro" className="text-sm font-semibold text-slate-800">
              Motivo del retiro
            </label>
            <textarea
              id="motivo-retiro"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError(null);
              }}
              maxLength={MOTIVO_RETIRO_MAX}
              rows={3}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "error-retiro" : undefined}
              placeholder="Ej: Tengo un examen ese día."
              className="w-full text-sm text-slate-900 border border-slate-300 rounded-xl px-3.5 py-2.5 resize-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:outline-none placeholder:text-slate-400"
            />
          </div>
        )}
        {error && (
          <p id="error-retiro" role="alert" className="text-xs font-medium text-rose-700">
            {error}
          </p>
        )}

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
          >
            {textos.mantener}
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
                <span>Retirando...</span>
              </>
            ) : (
              textos.confirmar
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
