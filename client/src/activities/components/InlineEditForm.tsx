import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { ApiActionResult } from "@/api/apiResults";
import { Button } from "@/components/ui/button";
import Image from "@/shared/components/Image";
import { SubmitButton } from "@/shared/components/SubmitButton";
import { appToast } from "@/shared/components/Toast";
import { useSubmitAction } from "@/shared/hooks/useSubmitAction";

type InlineEditFormProps = {
  initialValue: string;
  /** Acción del Provider (ya valida y llama al backend) */
  save: (value: string) => Promise<ApiActionResult>;
  successMessage: string;
  errorTitle: string;
  onClose: () => void;
  /** Ícono y textos que van arriba del campo (fecha, cupos) */
  header?: { icon: string; title: string; subtitle: string };
  className?: string;
  /** Dibuja el input con el valor actual */
  children: (value: string, setValue: (value: string) => void) => ReactNode;
};

/** Formulario para editar un solo campo de la actividad en el detalle. */
export function InlineEditForm({
  initialValue,
  save,
  successMessage,
  errorTitle,
  onClose,
  header,
  className = "space-y-3",
  children,
}: InlineEditFormProps) {
  const [value, setValue] = useState(initialValue);
  const submitAction = useSubmitAction();

  const handleSubmit = () =>
    submitAction({
      action: () => save(value),
      onSuccess: () => {
        appToast.success(successMessage);
        onClose();
      },
      errorTitle,
    });

  return (
    <form action={handleSubmit} className={className}>
      {header && (
        <div className="flex items-center">
          <div className="shrink-0 flex items-center justify-center mr-6">
            <Image
              src={header.icon}
              alt={header.title}
              width={34}
              height={34}
              unoptimized
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-texto leading-tight">{header.title}</p>
            <p className="text-xs text-texto-tenue mt-0.5">{header.subtitle}</p>
          </div>
        </div>
      )}

      {children(value, setValue)}

      <div className="grid grid-cols-2 gap-3 w-full pt-1">
        <Button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-superficie-alta hover:bg-superficie-hover text-texto-secundario hover:text-texto border-none shadow-none font-medium cursor-pointer"
        >
          Cancelar
        </Button>
        <SubmitButton
          text="Guardar"
          pendingText="Guardando..."
          icon={<Check className="w-4 h-4" />}
          className="w-full bg-accion hover:bg-accion-hover text-sobre-accion rounded-xl"
        />
      </div>
    </form>
  );
}
