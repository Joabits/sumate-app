import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/shared/components/SubmitButton";
import { appToast } from "@/shared/components/Toast";
import { useSubmitAction } from "@/shared/hooks/useSubmitAction";
import { useActivities } from "@/activities/hooks/useActivities";

type EditActivityDescriptionFormProps = {
  activityId: string;
  initialDescription: string | null;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditActivityDescriptionForm({
  activityId,
  initialDescription,
  onCancel,
  onSuccess,
}: EditActivityDescriptionFormProps) {
  const { updateDescription } = useActivities();
  const [descriptionText, setDescriptionText] = useState(initialDescription ?? "");
  const submitAction = useSubmitAction();

  const handleSubmit = async () => {
    await submitAction({
      action: () => updateDescription(activityId, descriptionText),
      onSuccess: () => {
        appToast.success("Descripción actualizada.");
        onSuccess();
      },
      errorTitle: "Error al actualizar descripción",
    });
  };

  return (
    <form action={handleSubmit} className="space-y-3">
      <textarea
        rows={5}
        value={descriptionText}
        onChange={(e) => setDescriptionText(e.target.value)}
        className="w-full text-sm leading-relaxed text-slate-700 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-[#6355de] focus:outline-none"
        placeholder="Describe la actividad, requisitos para voluntarios y objetivo social..."
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
