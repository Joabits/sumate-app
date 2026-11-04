"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { updateActivityImageAction } from "../../actions/activity.action";
import { useActivityDetailUiStore } from "../../stores/activity-detail-ui.store";

type ActivityDetailHeroProps = {
  activity: ActivityDetailData;
};

export function ActivityDetailHero({
  activity,
}: ActivityDetailHeroProps) {
  const { id: activityId, imageUrl, name: activityName, status, isOwner } = activity;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const { isEditMode } = useActivityDetailUiStore();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      appToast.error("Formato inválido", "El archivo debe ser una imagen válida.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      appToast.error("Archivo muy grande", "La imagen no debe superar los 2MB.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    startTransition(async () => {
      const res = await updateActivityImageAction(activityId, formData);
      if (!res.ok) {
        appToast.error(
          "Error",
          res.errors?.[0] ?? "No se pudo actualizar la imagen."
        );
        return;
      }
      appToast.success("Foto de portada actualizada exitosamente.");
    });
  };

  const renderStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700 tracking-tight">
              Inscripciones abiertas
            </span>
          </div>
        );
      case "draft":
        return (
          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
            <span className="text-xs font-semibold text-amber-800 tracking-tight">
              Borrador
            </span>
          </div>
        );
      case "closed":
        return (
          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400 mr-2" />
            <span className="text-xs font-semibold text-slate-600 tracking-tight">
              Convocatoria cerrada
            </span>
          </div>
        );
      case "cancelled":
        return (
          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 mr-2" />
            <span className="text-xs font-semibold text-rose-700 tracking-tight">
              Cancelada
            </span>
          </div>
        );
    }
  };

  return (
    <section
      className="relative w-full h-64 sm:h-72 mb-6 overflow-hidden rounded-3xl shadow-sm bg-slate-100 group"
      data-purpose="hero-image-container"
    >
      <Image
        src={imageUrl}
        alt={activityName}
        fill
        priority
        unoptimized
        sizes="(max-width: 768px) 100vw, 450px"
        className="object-cover transition-transform duration-300 group-hover:scale-102"
      />

      {/* Badge sutil de estado */}
      {renderStatusBadge()}

      {/* Disparador de cambio de imagen en modo edición */}
      {isOwner && isEditMode && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            aria-label="Cambiar foto de portada"
            className="absolute bottom-3.5 right-3.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
            title="Cambiar foto de portada"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
        </>
      )}
    </section>
  );
}
