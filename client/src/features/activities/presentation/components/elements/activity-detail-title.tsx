"use client";

import { Pencil } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { useActivityDetailUiStore } from "../../stores/activity-detail-ui.store";
import { EditActivityTitleForm } from "../forms/edit-activity-title-form";

type ActivityDetailTitleProps = {
  activity: ActivityDetailData;
  className?: string;
};

export function ActivityDetailTitle({
  activity,
  className = "",
}: ActivityDetailTitleProps) {
  const { isEditMode, activeField, setActiveField } = useActivityDetailUiStore();
  const { id: activityId, name, isOwner } = activity;

  const isOtherFieldActive = (field: string) =>
    activeField !== null && activeField !== field;

  return (
    <div className={`mb-4 sm:mb-6 ${className}`} data-purpose="event-title-section">
      {activeField === "title" ? (
        <EditActivityTitleForm
          activityId={activityId}
          initialTitle={name}
          onCancel={() => setActiveField(null)}
          onSuccess={() => setActiveField(null)}
        />
      ) : (
        <div>
          <h1 className="text-2xl sm:text-[1.65rem] lg:text-3xl font-extrabold text-slate-900 leading-snug tracking-tight">
            {name}
            {isOwner && isEditMode && (
              <button
                type="button"
                onClick={() => setActiveField("title")}
                disabled={isOtherFieldActive("title")}
                title="Editar título"
                aria-label="Editar título"
                className={`inline-flex items-center justify-center align-middle ml-2.5 p-1.5 rounded-full transition-all cursor-pointer ${
                  isOtherFieldActive("title")
                    ? "opacity-30 cursor-not-allowed text-slate-300"
                    : "text-slate-500 hover:text-[#6355de] hover:bg-slate-100"
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </h1>
        </div>
      )}
    </div>
  );
}
