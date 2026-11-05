"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AppSheet } from "@/features/shared/presentation/components/dialogs/app-sheet";
import { CreateActivityForm } from "../forms/create-activity-form";

type CreateActivitySheetProps = {
  /**
   * Desde Explorar la actividad nueva no aparece (es un borrador propio):
   * al crearla se lleva a Mis actividades para completarla y publicarla.
   */
  irAMisActividadesAlCrear?: boolean;
};

export function CreateActivitySheet({
  irAMisActividadesAlCrear = false,
}: CreateActivitySheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const alCrear = () => {
    setOpen(false);
    if (irAMisActividadesAlCrear) {
      router.push("/my-activities");
    }
  };

  return (
    <>
      {/* Botón flotante estilizado */}
      <div className="fixed bottom-6 right-5 lg:right-8 z-50 pointer-events-none">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Crear nueva actividad"
          className="pointer-events-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#6355de] text-white shadow-lg shadow-[#6355de]/35 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6355de] font-semibold text-sm cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Crear actividad</span>
        </button>
      </div>

      {/* Sheet adaptativo: Bottom Sheet en móvil, Right Sheet en desktop */}
      <AppSheet
        open={open}
        onOpenChange={setOpen}
        title="Crear actividad"
        description="Publica una nueva convocatoria comunitaria"
        showHeader
        showCloseButton
        autoFocusInput={false}
        bodyClassName="px-6 lg:px-8 py-5"
      >
        <div className="pb-2">
          <CreateActivityForm onSuccess={alCrear} />
        </div>
      </AppSheet>
    </>
  );
}
