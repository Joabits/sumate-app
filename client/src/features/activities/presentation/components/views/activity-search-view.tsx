"use client";

import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivitySearch } from "../../hooks/use-activity-search";
import { ActivitySearchHeader } from "../elements/activity-search-header";
import { ActivitySearchFiltersSheet } from "../elements/activity-search-filters-sheet";
import { ActivityCard } from "../elements/activity-card";

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
                className="bg-white rounded-2xl border border-slate-100 lg:border-none p-3 shadow-xs lg:shadow-none space-y-3"
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
            <div className="w-16 h-16 rounded-full bg-[#f3f1fd] text-[#6355de] flex items-center justify-center mb-3">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Explora actividades
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs leading-relaxed">
              No hay resultados aún, intenta buscar algo
            </p>
          </div>
        )}

        {/* Estado Vacío (Búsqueda ejecutada sin coincidencias) */}
        {!isLoading && hasSearched && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Sin resultados
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs leading-relaxed">
              No se ha encontrado nada en base a ese filtro de búsqueda
            </p>
            <button
              type="button"
              onClick={openFiltersSheet}
              aria-label="Ajustar filtros de búsqueda"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#6355de] bg-[#f3f1fd] hover:bg-[#eae6fd] active:scale-95 transition-all cursor-pointer shadow-xs border border-[#6355de]/15"
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
