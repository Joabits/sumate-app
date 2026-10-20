"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/features/shared/presentation/components/custom-buttons/submit-button";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { useSubmitWithSchema } from "@/features/shared/presentation/hooks/use-submit-with-schema";
import { updateActivityInfoAction } from "../../actions/activity.action";
import { EditTitleSchema } from "@/features/activities/infrastructure/schemas/activity.schemas";

type EditActivityTitleFormProps = {
  activityId: string;
  initialTitle: string;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditActivityTitleForm({
  activityId,
  initialTitle,
  onCancel,
  onSuccess,
}: EditActivityTitleFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const submitWithSchema = useSubmitWithSchema();

  const handleSubmit = async () => {
    await submitWithSchema({
      schema: EditTitleSchema,
      payload: { name: title },
      action: (data) => updateActivityInfoAction(activityId, { name: data.name }),
      onSuccess: () => {
        appToast.success("Título actualizado.");
        onSuccess();
      },
      errorTitle: "Error al actualizar título",
    });
  };

  return (
    <form action={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-xl font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#6355de] focus:outline-none"
        placeholder="Nombre de la actividad"
        autoFocus
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
