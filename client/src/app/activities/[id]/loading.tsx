import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityDetailLoading() {
  return (
    <div
      className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-indigo-100"
      data-purpose="activity-detail-skeleton"
    >
      <main className="w-full max-w-md lg:max-w-6xl mx-auto flex-1 pb-28 px-5 lg:px-8 pt-2 sm:pt-4">
        {/* Cabecera superior con botón Volver y acciones */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-0 pt-3 sm:pt-4 pb-3 mb-4 bg-white">
          <Skeleton className="h-11 w-11 lg:w-24 rounded-full bg-slate-100" />
          <div className="flex items-center space-x-2.5">
            <Skeleton className="w-11 h-11 rounded-full bg-slate-100" />
            <Skeleton className="w-11 h-11 rounded-full bg-slate-100" />
          </div>
        </header>

        {/* Distribución 2 columnas en desktop (60% / 40%) */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start mt-2">
          {/* Columna Izquierda (~60%) */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Portada y badge */}
            <div className="relative w-full h-64 sm:h-72 lg:h-80 mb-6 rounded-3xl bg-slate-100 overflow-hidden">
              <Skeleton className="w-full h-full rounded-3xl bg-slate-200/90" />
              <div className="absolute top-3.5 left-3.5">
                <Skeleton className="h-7 w-36 rounded-full bg-white/80" />
              </div>
            </div>

            {/* Título de la actividad en desktop */}
            <div className="hidden lg:block mb-6 space-y-2">
              <Skeleton className="h-8 w-4/5 rounded-lg bg-slate-200/90" />
              <Skeleton className="h-8 w-2/5 rounded-lg bg-slate-200/70" />
            </div>

            {/* Descripción */}
            <section className="mt-2 lg:mt-0 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-28 rounded-md bg-slate-200/80" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md bg-slate-100" />
                <Skeleton className="h-4 w-11/12 rounded-md bg-slate-100" />
                <Skeleton className="h-4 w-3/4 rounded-md bg-slate-100" />
              </div>
            </section>
          </div>

          {/* Columna Derecha (~40%) */}
          <div className="lg:col-span-5 flex flex-col lg:bg-slate-50/60 lg:border lg:border-slate-100 lg:rounded-3xl lg:p-6 lg:shadow-xs">
            {/* Título de la actividad en móvil */}
            <div className="mb-6 space-y-2 lg:hidden">
              <Skeleton className="h-7 w-4/5 rounded-lg bg-slate-200/90" />
              <Skeleton className="h-7 w-2/5 rounded-lg bg-slate-200/70" />
            </div>

            {/* Información clave (Fecha, Cupos, Ubicación) */}
            <section className="space-y-4 mb-7">
              {/* Fecha */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100/90">
                <div className="flex items-center flex-1 mr-2">
                  <div className="shrink-0 flex items-center justify-center mr-6">
                    <Skeleton className="w-8 h-8 rounded-xl bg-slate-100" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-44 rounded-md bg-slate-200/80" />
                    <Skeleton className="h-3 w-20 rounded-md bg-slate-100" />
                  </div>
                </div>
                <Skeleton className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
              </div>

              {/* Cupos */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100/90">
                <div className="flex items-center flex-1 mr-2">
                  <div className="shrink-0 flex items-center justify-center mr-6">
                    <Skeleton className="w-8 h-8 rounded-xl bg-slate-100" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32 rounded-md bg-slate-200/80" />
                    <Skeleton className="h-3 w-24 rounded-md bg-slate-100" />
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 mr-2">
                  <div className="shrink-0 flex items-center justify-center mr-6">
                    <Skeleton className="w-8 h-8 rounded-xl bg-slate-100" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-36 rounded-md bg-slate-200/80" />
                    <Skeleton className="h-3 w-48 rounded-md bg-slate-100" />
                  </div>
                </div>
                <Skeleton className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
              </div>
            </section>

            {/* Organizador */}
            <section className="mt-2 pt-5 border-t border-slate-100">
              <Skeleton className="h-3 w-24 rounded-md bg-slate-100 uppercase mb-3" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-11 h-11 rounded-full bg-slate-200/80 shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28 rounded-md bg-slate-200/80" />
                    <Skeleton className="h-3 w-36 rounded-md bg-slate-100" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-indigo-50/80 shrink-0" />
              </div>
            </section>

            {/* Participantes */}
            <section className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-24 rounded-md bg-slate-100 uppercase" />
              </div>
              <div className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full bg-indigo-50/80 shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 rounded-md bg-slate-200/80" />
                    <Skeleton className="h-3 w-28 rounded-md bg-slate-100" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2.5">
                    <Skeleton className="w-7 h-7 rounded-full bg-slate-200 ring-2 ring-white" />
                    <Skeleton className="w-7 h-7 rounded-full bg-slate-200 ring-2 ring-white" />
                    <Skeleton className="w-7 h-7 rounded-full bg-slate-200 ring-2 ring-white" />
                  </div>
                  <Skeleton className="w-4 h-4 rounded-full bg-slate-100" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Botón flotante inferior alineado con el contenedor */}
      <div className="fixed bottom-6 inset-x-0 pointer-events-none z-40">
        <div className="w-full max-w-md lg:max-w-6xl mx-auto px-5 lg:px-8 flex justify-end">
          <Skeleton className="h-12 w-36 rounded-full bg-slate-200/90 shadow-lg pointer-events-auto" />
        </div>
      </div>
    </div>
  );
}
