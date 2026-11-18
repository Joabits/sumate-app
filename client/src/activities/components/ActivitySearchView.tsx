import { MapPinOff, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivitySearch } from "@/activities/hooks/useActivitySearch";
import { ActivitySearchHeader } from "./ActivitySearchHeader";
import { ActivitySearchFiltersSheet } from "./ActivitySearchFiltersSheet";
import { ActivityCard } from "./ActivityCard";

export function ActivitySearchView() {
  const {
    query,
    setQuery,
    clearQuery,
    submitSearch,
    draftFilters,
    setDraftFilters,
    isFiltersSheetOpen,
    setIsFiltersSheetOpen,
    openFiltersSheet,
    applyDraftFilters,
    resetDraftFilters,
    hasSearched,
    isLoading,
    items,
    activeFiltersCount,
    sinUbicacion,
    quitarFiltroDeDistancia,
  } = useActivitySearch();

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full -mx-5 lg:-mx-8" data-purpose="activity-search-view">
      {/* Header Fijo con Navegación y Acciones */}
      <ActivitySearchHeader
        query={query}
        onQueryChange={setQuery}
        onClearQuery={clearQuery}
        onSubmit={submitSearch}
        onOpenFilters={openFiltersSheet}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Área de Scroll de Contenido con los mismos márgenes laterales que AppHeader y los feeds */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 lg:px-8 pt-3 pb-24 lg:pb-12" data-purpose="activity-search-scroll">
        {/* Estado de Carga */}
        {isLoading && (
          <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-fondo rounded-2xl border border-borde-suave lg:border-none p-3 shadow-xs lg:shadow-none space-y-3"
              >
                <Skeleton className="w-full h-44 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado Inicial (Sin búsqueda disparada) */}
        {!isLoading && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-accion-suave text-accion flex items-center justify-center mb-3">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-texto">
              Explora actividades
            </h3>
            <p className="text-sm text-texto-tenue mt-1 max-w-xs leading-relaxed">
              No hay resultados aún, intenta buscar algo
            </p>
          </div>
        )}

        {/* Filtro de distancia sin ubicación: se explica y se ofrecen otras salidas */}
        {!isLoading && sinUbicacion && (
          <div role="status" className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-superficie-alta text-texto-tenue flex items-center justify-center mb-3">
              <MapPinOff className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-texto">
              No pudimos usar tu ubicación
            </h3>
            <p className="text-sm text-texto-tenue mt-1 max-w-xs leading-relaxed">
              El filtro de distancia la necesita para saber qué actividades están cerca.
              Puedes permitirla en tu navegador, o escribir tu zona en el buscador
              (por ejemplo, «Sopocachi») y quitar el filtro.
            </p>
            <button
              type="button"
              onClick={quitarFiltroDeDistancia}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-accion bg-accion-suave hover:bg-accion-suave-hover active:scale-95 transition-all cursor-pointer shadow-xs border border-accion/15"
            >
              Quitar el filtro de distancia
            </button>
          </div>
        )}

        {/* Estado Vacío (Búsqueda ejecutada sin coincidencias) */}
        {!isLoading && hasSearched && !sinUbicacion && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-superficie-alta text-texto-tenue flex items-center justify-center mb-3">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-texto">
              Sin resultados
            </h3>
            <p className="text-sm text-texto-tenue mt-1 max-w-xs leading-relaxed">
              No se ha encontrado nada en base a ese filtro de búsqueda
            </p>
            <button
              type="button"
              onClick={openFiltersSheet}
              aria-label="Ajustar filtros de búsqueda"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-accion bg-accion-suave hover:bg-accion-suave-hover active:scale-95 transition-all cursor-pointer shadow-xs border border-accion/15"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajustar filtros</span>
            </button>
          </div>
        )}

        {/* Lista de Resultados: 3 columnas en escritorio */}
        {!isLoading && hasSearched && items.length > 0 && (
          <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6">
            {items.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                scope="others"
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet de Filtros */}
      <ActivitySearchFiltersSheet
        open={isFiltersSheetOpen}
        onOpenChange={setIsFiltersSheetOpen}
        draftFilters={draftFilters}
        onDraftFiltersChange={setDraftFilters}
        onApply={applyDraftFilters}
        onReset={resetDraftFilters}
      />
    </div>
  );
}
