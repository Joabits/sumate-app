"use client";

import { useEffect } from "react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { useActivityDetailUiStore } from "../../stores/activity-detail-ui.store";
import { LocationMapSheet } from "../dialogs/location-map-sheet";
import { ActivityDetailActions } from "../elements/activity-detail-actions";
import { ActivityDetailDescription } from "../elements/activity-detail-description";
import { ActivityDetailHeader } from "../elements/activity-detail-header";
import { ActivityDetailHero } from "../elements/activity-detail-hero";
import { ActivityDetailInfo } from "../elements/activity-detail-info";
import { ActivityDetailTitle } from "../elements/activity-detail-title";
import { ActivityDetailOrganizer } from "../elements/activity-detail-organizer";
import { ActivityDetailParticipants } from "../elements/activity-detail-participants";

type ActivityDetailViewProps = {
  activity: ActivityDetailData;
};

export function ActivityDetailView({ activity }: ActivityDetailViewProps) {
  const { isLocationSheetOpen, closeLocationSheet, reset } =
    useActivityDetailUiStore();

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-indigo-100">
      {/* Contenedor responsivo: max-w-md centrado en móviles/tablets; max-w-6xl amplio en desktop (>= lg) */}
      <main className="w-full max-w-md lg:max-w-6xl mx-auto flex-1 pb-28 px-5 lg:px-8 pt-2 sm:pt-4">
        {/* Cabecera superior común con volver atrás (con texto en desktop), compartir, editar y eliminar */}
        <ActivityDetailHeader activity={activity} />

        {/* 
          Disposición en dos columnas para escritorio (>= 1024px):
          - Columna Izquierda (60% / col-span-7): Foto de portada, Título y Descripción.
          - Columna Derecha (40% / col-span-5): Datos clave (fecha, cupos, causas, mapa), Organizador y Participantes.
        */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start mt-2">
          {/* Columna Izquierda (~60%) */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Foto de portada y badge de estado */}
            <ActivityDetailHero activity={activity} />

            {/* Título de la actividad en desktop con soporte para edición si es owner */}
            <div className="hidden lg:block">
              <ActivityDetailTitle activity={activity} />
            </div>

            {/* Descripción de la actividad */}
            <ActivityDetailDescription activity={activity} />
          </div>

          {/* Columna Derecha (~40%) */}
          <div className="lg:col-span-5 flex flex-col lg:bg-slate-50/60 lg:border lg:border-slate-100 lg:rounded-3xl lg:p-6 lg:shadow-xs">
            {/* Título (visible solo en móvil), Fecha y Hora, Cupos y Ubicación */}
            <ActivityDetailInfo activity={activity} />

            {/* Sección del organizador */}
            <ActivityDetailOrganizer activity={activity} />

            {/* Participantes confirmados */}
            <ActivityDetailParticipants activity={activity} />
          </div>
        </div>
      </main>

      {/* Botón flotante de acción (Asistiré / Publicar / Cerrar convocatoria) anclado a la derecha */}
      <ActivityDetailActions activity={activity} />

      {/* Bottom Sheet con mapa Leaflet para edición de ubicación */}
      <LocationMapSheet
        activity={activity}
        isOpen={isLocationSheetOpen}
        onClose={closeLocationSheet}
      />
    </div>
  );
}
