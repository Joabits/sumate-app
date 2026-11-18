import { useState } from "react";
import Image from "@/shared/components/Image";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appToast } from "@/shared/components/Toast";
import type { ActivityStatus, Cause } from "@/activities/context/activitiesTypes";
import { useActivities } from "@/activities/hooks/useActivities";

type EditActivityCausesFormProps = {
  activityId: string;
  initialCauses: Cause[];
  activityStatus: ActivityStatus;
  onCancel: () => void;
  onSuccess: () => void;
};

export function EditActivityCausesForm({
  activityId,
  initialCauses,
  activityStatus,
  onCancel,
  onSuccess,
}: EditActivityCausesFormProps) {
  const { causes: cachedCauses, isLoadingCauses, replaceCauses } = useActivities();

  const [selectedCauseIds, setSelectedCauseIds] = useState<Set<string>>(
    () => new Set(initialCauses.map((c) => c.id))
  );
  const [isSaving, setIsSaving] = useState(false);

  const isLoadingCatalog = isLoadingCauses && cachedCauses.length === 0;

  const toggleCause = (causeId: string) => {
    setSelectedCauseIds((prev) => {
      const next = new Set(prev);
      if (next.has(causeId)) {
        next.delete(causeId);
      } else {
        next.add(causeId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const causeIdsArray = Array.from(selectedCauseIds);

    if (activityStatus === "active" && causeIdsArray.length === 0) {
      appToast.error(
        "Acción no permitida",
        "Una actividad publicada debe mantener al menos una causa asignada."
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await replaceCauses(activityId, causeIdsArray);
      if (!res.ok) {
        appToast.error(
          "Error al actualizar causas",
          res.errors?.[0] ?? "No se pudieron actualizar las causas temáticas."
        );
        return;
      }
      appToast.success("Causas temáticas actualizadas.");
      onSuccess();
    } catch {
      appToast.error(
        "Error al actualizar causas",
        "Ocurrió un error inesperado al guardar."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pb-4 border-b border-borde-suave/90 space-y-4 w-full">
      <div className="flex items-center">
        <div className="shrink-0 flex items-center justify-center mr-6">
          <Image
            src="/assets/icons/cause.webp"
            alt="Causas"
            width={34}
            height={34}
            unoptimized
            className="w-8 h-8 object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-texto leading-tight">
            Causas temáticas
          </p>
          <p className="text-xs text-texto-tenue mt-0.5">
            Selecciona una o más causas que representen esta actividad
          </p>
        </div>
      </div>

      {isLoadingCatalog ? (
        <div className="flex items-center justify-center py-4 text-texto-tenue gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Cargando causas disponibles...</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {cachedCauses.map((cause) => {
            const isSelected = selectedCauseIds.has(cause.id);
            return (
              <button
                key={cause.id}
                type="button"
                onClick={() => toggleCause(cause.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-accion text-sobre-accion border-accion shadow-sm shadow-accion/20"
                    : "bg-fondo text-texto-secundario hover:bg-superficie-alta border-borde shadow-2xs"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{cause.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 w-full pt-1">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="w-full rounded-xl bg-superficie-alta hover:bg-superficie-hover text-texto-secundario hover:text-texto border-none shadow-none font-medium cursor-pointer"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isLoadingCatalog}
          className="w-full bg-accion hover:bg-accion-hover text-sobre-accion rounded-xl flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Guardar</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
