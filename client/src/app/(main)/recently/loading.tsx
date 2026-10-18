import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="flex-1 flex flex-col min-h-0 h-full overflow-hidden"
      data-purpose="activities-skeleton"
    >
      {/* Filtros Skeleton */}
      <div className="flex items-center justify-start gap-2 pt-4 pb-3 border-b border-slate-100/80 px-1 bg-white shrink-0">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full bg-slate-100" />
        ))}
      </div>

      {/* Grid de Actividades Skeleton: móvil 1 columna, desktop (>= lg) 3 columnas */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-3 pb-24 lg:pb-12">
        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="pb-6 lg:pb-0 border-b border-slate-100 lg:border-none animate-pulse duration-700 flex flex-col"
            >
              {/* Skeleton para imagen */}
              <Skeleton className="w-full h-44 lg:h-52 rounded-2xl bg-slate-200/90 shrink-0" />

              {/* Skeleton para textos */}
              <div className="pt-3 px-1 space-y-2.5">
                <Skeleton className="h-5 w-4/5 rounded-md bg-slate-200/90" />
                <Skeleton className="h-4 w-1/3 rounded-md bg-slate-200/80" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-4 w-28 rounded-md bg-slate-100" />
                  <Skeleton className="h-4 w-16 rounded-md bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
