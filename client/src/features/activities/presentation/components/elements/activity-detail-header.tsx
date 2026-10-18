"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, Pencil, Share2, Trash2 } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { AppAlertDialog } from "@/features/shared/presentation/components/dialogs/app-alert-dialog";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { deleteActivityAction } from "../../actions/activity.action";
import { useActivityDetailUiStore } from "../../stores/activity-detail-ui.store";

type ActivityDetailHeaderProps = {
  activity: ActivityDetailData;
};

export function ActivityDetailHeader({
  activity,
}: ActivityDetailHeaderProps) {
  const router = useRouter();
  const { isEditMode, toggleEditMode } = useActivityDetailUiStore();
  const { id: activityId, name: activityName, isOwner } = activity;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/explore");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activityName,
          text: `Te invito a unirte a "${activityName}" en Súmate`,
          url,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      appToast.success("Enlace copiado al portapapeles.");
    } catch {
      appToast.info("Copia el enlace de la barra de direcciones.");
    }
  };

  const handleConfirmDelete = () => {
    startDeleting(async () => {
      const res = await deleteActivityAction(activityId);
      if (res.ok) {
        appToast.success("Actividad eliminada correctamente.");
        router.replace("/my-activities");
      } else {
        appToast.error(
          "Error al eliminar la actividad",
          res.errors?.[0] ?? "No se pudo eliminar la actividad."
        );
        setIsDeleteDialogOpen(false);
      }
    });
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-0 pt-3 sm:pt-4 pb-3 mb-4 bg-white transition-colors"
        data-purpose="top-navigation-bar"
      >
        {/* Botón Volver Atrás: en móvil solo ícono, en desktop (>= lg) ícono + texto "Volver" */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver atrás"
          className="h-11 px-3.5 lg:px-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 hover:bg-slate-200 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 -ml-1 shrink-0" />
          <span className="hidden lg:inline ml-1 text-sm font-semibold tracking-tight">
            Volver
          </span>
        </button>

        {/* Acciones de la derecha: en móvil íconos circulares, en escritorio (>= lg) píldoras con ícono + texto */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Compartir evento"
            title="Compartir evento"
            className="h-11 w-11 lg:w-auto px-0 lg:px-4 rounded-full bg-slate-100 flex items-center justify-center gap-1.5 text-slate-700 active:scale-95 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <Share2 className="w-4.5 h-4.5 shrink-0" />
            <span className="hidden lg:inline text-xs lg:text-sm font-semibold tracking-tight">
              Compartir
            </span>
          </button>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                aria-label="Eliminar actividad"
                title="Eliminar actividad"
                className="h-11 w-11 lg:w-auto px-0 lg:px-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center gap-1.5 active:scale-95 hover:bg-rose-100 transition-all cursor-pointer"
              >
                <Trash2 className="w-4.5 h-4.5 shrink-0" />
                <span className="hidden lg:inline text-xs lg:text-sm font-semibold tracking-tight">
                  Eliminar
                </span>
              </button>

              <button
                type="button"
                onClick={toggleEditMode}
                aria-label={isEditMode ? "Volver a modo lectura" : "Activar modo edición"}
                title={isEditMode ? "Volver a modo lectura" : "Editar actividad"}
                className={`h-11 w-11 lg:w-auto px-0 lg:px-4 rounded-full flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                  isEditMode
                    ? "bg-[#6355de] text-white shadow-md shadow-[#6355de]/30 ring-2 ring-[#6355de] ring-offset-2"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isEditMode ? (
                  <>
                    <Eye className="w-4.5 h-4.5 shrink-0" />
                    <span className="hidden lg:inline text-xs lg:text-sm font-semibold tracking-tight">
                      Modo lectura
                    </span>
                  </>
                ) : (
                  <>
                    <Pencil className="w-4.5 h-4.5 shrink-0" />
                    <span className="hidden lg:inline text-xs lg:text-sm font-semibold tracking-tight">
                      Editar
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {isOwner && (
        <AppAlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="¿Eliminar esta actividad?"
          description="Esta acción eliminará la actividad de forma permanente. No podrás deshacer esta acción."
          actionText={isDeleting ? "Eliminando..." : "Eliminar"}
          cancelText="Cancelar"
          actionDisabled={isDeleting}
          onAction={handleConfirmDelete}
        />
      )}
    </>
  );
}
