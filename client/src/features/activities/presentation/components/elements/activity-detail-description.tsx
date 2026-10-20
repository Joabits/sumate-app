"use client";

import { Pencil } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { useActivityDetailUiStore } from "../../stores/activity-detail-ui.store";
import { EditActivityDescriptionForm } from "../forms/edit-activity-description-form";

type ActivityDetailDescriptionProps = {
  activity: ActivityDetailData;
  className?: string;
};

export function ActivityDetailDescription({
  activity,
  className = "mt-6 pt-5 border-t border-slate-100",
}: ActivityDetailDescriptionProps) {
  const { isEditMode, activeField, setActiveField } = useActivityDetailUiStore();
  const { id: activityId, isOwner } = activity;
  const description = activity.detail?.description ?? null;

  const isEditing = activeField === "description";
  const isOtherActive = activeField !== null && activeField !== "description";

  return (
    <section
      className={className}
      data-purpose="event-description-section"
    >
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-lg font-bold text-slate-900">Descripción</h2>
        {isOwner && isEditMode && !isEditing && (
          <button
            type="button"
            onClick={() => setActiveField("description")}
            disabled={isOtherActive}
            aria-label="Editar descripción"
            className={`p-1.5 rounded-full transition-all cursor-pointer ${
              isOtherActive
                ? "opacity-30 cursor-not-allowed text-slate-300"
                : "text-slate-400 hover:text-[#6355de] hover:bg-slate-100"
            }`}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <EditActivityDescriptionForm
          activityId={activityId}
          initialDescription={description}
          onCancel={() => setActiveField(null)}
          onSuccess={() => setActiveField(null)}
        />
      ) : (
        <p className="text-sm leading-relaxed text-slate-600 font-normal whitespace-pre-line">
          {description?.trim() ? (
            description
          ) : (
            <span className="italic text-slate-400">
              {isOwner
                ? "Aún no has agregado una descripción. Activa el modo edición para redactarla."
                : "Sin descripción añadida aún."}
            </span>
          )}
        </p>
      )}
    </section>
  );
}

