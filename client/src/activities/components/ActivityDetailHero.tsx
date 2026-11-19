import { useRef, useTransition } from "react";
import Image from "@/shared/components/Image";
import { Camera, Loader2 } from "lucide-react";
import { appToast } from "@/shared/components/Toast";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";
import { useActivities } from "@/activities/hooks/useActivities";

export function ActivityDetailHero() {
  const { updateImage } = useActivities();
  const { activity, isEditMode } = useActivityDetail();
  const { id: activityId, imageUrl, name: activityName, status, isOwner } = activity;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const res = await updateImage(activityId, file);
      if (!res.ok) {
        appToast.error(
          "No se pudo actualizar la imagen",
          res.errors?.[0] ?? "Inténtalo nuevamente."
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
          <div className="absolute top-3.5 left-3.5 bg-fondo/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-exito mr-2 animate-pulse" />
            <span className="text-xs font-semibold text-texto-secundario tracking-tight">
              Inscripciones abiertas
            </span>
          </div>
        );
      case "draft":
        return (
          <div className="absolute top-3.5 left-3.5 bg-fondo/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-aviso mr-2 animate-pulse" />
            <span className="text-xs font-semibold text-aviso-fuerte tracking-tight">
              Borrador
            </span>
          </div>
        );
      case "closed":
        return (
          <div className="absolute top-3.5 left-3.5 bg-fondo/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-texto-tenue mr-2" />
            <span className="text-xs font-semibold text-texto-secundario tracking-tight">
              Convocatoria cerrada
            </span>
          </div>
        );
      case "cancelled":
        return (
          <div className="absolute top-3.5 left-3.5 bg-fondo/95 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center shadow-xs">
            <span className="w-2 h-2 rounded-full bg-error mr-2" />
            <span className="text-xs font-semibold text-error-fuerte tracking-tight">
              Cancelada
            </span>
          </div>
        );
    }
  };

  return (
    <section
      className="relative w-full h-64 sm:h-72 mb-6 overflow-hidden rounded-3xl shadow-sm bg-superficie-alta group"
      data-purpose="hero-image-container"
    >
      <Image
        src={imageUrl}
        alt=""
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
            className="absolute bottom-3.5 right-3.5 bg-velo/60 hover:bg-velo/80 backdrop-blur-md text-sobre-accion p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
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
