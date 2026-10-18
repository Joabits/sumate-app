"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import type { ActivityStatus, Cause } from "@/features/activities/domain/entities/activity.entity";
import { replaceActivityCausesAction } from "../../actions/activity.action";
import { useCausesStore } from "../../stores/causes.store";

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
  const {
    causes: cachedCauses,
    isLoaded,
    isLoading: isCatalogLoading,
    fetchCauses,
  } = useCausesStore();

  const [selectedCauseIds, setSelectedCauseIds] = useState<Set<string>>(
    () => new Set(initialCauses.map((c) => c.id))
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || cachedCauses.length === 0) {
      fetchCauses();
    }
  }, [isLoaded, cachedCauses.length, fetchCauses]);

  const isLoadingCatalog = !isLoaded && isCatalogLoading && cachedCauses.length === 0;

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
      const res = await replaceActivityCausesAction(activityId, causeIdsArray);
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
    <form onSubmit={handleSubmit} className="pb-4 border-b border-slate-100/90 space-y-4 w-full">
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
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            Causas temáticas
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona una o más causas que representen esta actividad
          </p>
        </div>
      </div>

      {isLoadingCatalog ? (
        <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
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
                    ? "bg-[#6355de] text-white border-[#6355de] shadow-sm shadow-[#6355de]/20"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
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
          className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isLoadingCatalog}
          className="w-full bg-[#6355de] hover:bg-[#5446cc] text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
