"use client";

import { useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/features/shared/presentation/components/custom-buttons/submit-button";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { useSubmitWithSchema } from "@/features/shared/presentation/hooks/use-submit-with-schema";
import { updateActivityInfoAction } from "../../actions/activity.action";
import { EditDateSchema } from "@/features/activities/infrastructure/schemas/activity.schemas";

type EditActivityDateFormProps = {
  activityId: string;
  initialDate: string;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditActivityDateForm({
  activityId,
  initialDate,
  onCancel,
  onSuccess,
}: EditActivityDateFormProps) {
  const [dateValue, setDateValue] = useState(initialDate);
  const submitWithSchema = useSubmitWithSchema();

  const handleSubmit = async () => {
    await submitWithSchema({
      schema: EditDateSchema,
      payload: { date: dateValue },
      action: (data) =>
        updateActivityInfoAction(activityId, {
          date: new Date(data.date).toISOString(),
        }),
      onSuccess: () => {
        appToast.success("Fecha actualizada.");
        onSuccess();
      },
      errorTitle: "Error al actualizar fecha",
    });
  };

  return (
    <form action={handleSubmit} className="pb-4 border-b border-slate-100/90 space-y-3 w-full">
      <div className="flex items-center">
        <div className="shrink-0 flex items-center justify-center mr-6">
          <Image
            src="/assets/icons/date.webp"
            alt="Fecha"
            width={34}
            height={34}
            unoptimized
            className="w-8 h-8 object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            Fecha y hora
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona la fecha y hora de la actividad
          </p>
        </div>
      </div>

      <input
        type="datetime-local"
        value={dateValue}
        onChange={(e) => setDateValue(e.target.value)}
        className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#6355de] focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-3 w-full pt-1">
        <Button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
        >
          Cancelar
        </Button>
        <SubmitButton
          text="Guardar"
          pendingText="Guardando..."
          icon={<Check className="w-4 h-4" />}
          className="w-full bg-[#6355de] hover:bg-[#5446cc] text-white rounded-xl"
        />
      </div>
    </form>
  );
}
