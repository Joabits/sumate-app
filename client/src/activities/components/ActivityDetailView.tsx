import { LocationMapSheet } from "./LocationMapSheet";
import { ActivityDetailActions } from "./ActivityDetailActions";
import { ActivityDetailDescription } from "./ActivityDetailDescription";
import { ActivityDetailHeader } from "./ActivityDetailHeader";
import { ActivityDetailHero } from "./ActivityDetailHero";
import { ActivityDetailInfo } from "./ActivityDetailInfo";
import { ActivityDetailTitle } from "./ActivityDetailTitle";
import { ActivityDetailOrganizer } from "./ActivityDetailOrganizer";
import { ActivityDetailParticipants } from "./ActivityDetailParticipants";
import { SolicitudesPendientes } from "./SolicitudesPendientes";
import { ListaDeEspera } from "./ListaDeEspera";
import { AvisoCancelacion } from "./AvisoCancelacion";
import { PostulantesCancelados } from "./PostulantesCancelados";

/** Pantalla de detalle. Cada parte lee la actividad con useActivityDetail(), sin props. */
export function ActivityDetailView() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-indigo-100">
      {/* Contenedor responsivo: max-w-md centrado en móviles/tablets; max-w-6xl amplio en desktop (>= lg) */}
      <main className="w-full max-w-md lg:max-w-6xl mx-auto flex-1 pb-28 px-5 lg:px-8 pt-2 sm:pt-4">
        {/* Cabecera superior común con volver atrás (con texto en desktop), compartir, editar y eliminar */}
        <ActivityDetailHeader />

        {/* Si la organización canceló la actividad, todos ven el aviso y el motivo */}
        <AvisoCancelacion />

        {/* 
          Disposición en Móvil / Tablet (< 1024px):
          Orden solicitado:
          1. Foto de portada
          2. Nombre de la actividad
          3. Detalles en card (fecha, cupos, causas temáticas y ubicación)
          4. Descripción
          5. Organizado por
          6. Participantes
        */}
        <div className="lg:hidden flex flex-col mt-2">
          {/* 1. Foto de portada y badge de estado */}
          <ActivityDetailHero />

          {/* 2. Nombre de la actividad */}
          <ActivityDetailTitle />

          {/* 3. Detalles de la actividad dentro de un card */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs mb-6">
            <ActivityDetailInfo />
          </div>

          {/* 4. Descripción de la actividad */}
          <ActivityDetailDescription className="pt-5 border-t border-slate-100" />

          {/* 5. Sección del organizador */}
          <ActivityDetailOrganizer />

          {/* 6. Solicitudes pendientes (solo organizador) y participantes confirmados */}
          <SolicitudesPendientes />
          <ListaDeEspera />
          <PostulantesCancelados />
          <ActivityDetailParticipants />
        </div>

        {/* 
          Disposición en dos columnas para escritorio (>= 1024px):
          - Columna Izquierda (60% / col-span-7): Foto de portada, Título y Descripción.
          - Columna Derecha (40% / col-span-5): Datos clave (fecha, cupos, causas, ubicación) en card, Organizador y Participantes.
        */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start mt-2">
          {/* Columna Izquierda (~60%) */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Foto de portada y badge de estado */}
            <ActivityDetailHero />

            {/* Título de la actividad en desktop */}
            <ActivityDetailTitle />

            {/* Descripción de la actividad */}
            <ActivityDetailDescription />
          </div>

          {/* Columna Derecha (~40%) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50/60 border border-slate-100 rounded-3xl p-6 shadow-xs">
            {/* Fecha y Hora, Cupos, Causas y Ubicación */}
            <ActivityDetailInfo />

            {/* Sección del organizador */}
            <ActivityDetailOrganizer />

            {/* Solicitudes pendientes (solo organizador) y participantes confirmados */}
            <SolicitudesPendientes />
            <ListaDeEspera />
            <PostulantesCancelados />
            <ActivityDetailParticipants />
          </div>
        </div>

      </main>

      {/* Botón flotante de acción (Asistiré / Publicar / Cerrar convocatoria) anclado a la derecha */}
      <ActivityDetailActions />

      {/* Bottom Sheet con mapa Leaflet para edición de ubicación */}
      <LocationMapSheet />
    </div>
  );
}
