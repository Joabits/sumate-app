"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ListFilter, Search, X } from "lucide-react";

interface ActivitySearchHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClearQuery: () => void;
  onSubmit: () => void;
  onOpenFilters: () => void;
  activeFiltersCount?: number;
}

export function ActivitySearchHeader({
  query,
  onQueryChange,
  onClearQuery,
  onSubmit,
  onOpenFilters,
  activeFiltersCount = 0,
}: ActivitySearchHeaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleBack = () => {
    router.push("/explore");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-5 lg:px-8 pt-4 pb-2 border-b border-slate-100 lg:border-none"
      data-purpose="activity-search-header"
    >
      <div className="flex items-center justify-between gap-3 lg:gap-6 w-full">
        {/* Lado izquierdo: Botón Volver + Input inmediatamente después */}
        <div className="flex items-center gap-3 flex-1 lg:flex-initial min-w-0">
          {/* Botón Volver Atrás: en móvil solo ícono, en escritorio ícono + texto "Volver" */}
          <button
            type="button"
            onClick={handleBack}
            aria-label="Volver a explorar"
            title="Volver a explorar"
            className="h-10 lg:h-11 w-10 lg:w-auto px-0 lg:px-4 rounded-full bg-slate-100 flex items-center justify-center gap-1.5 text-slate-700 active:scale-95 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-5 h-5 -ml-0.5 lg:-ml-1 shrink-0" />
            <span className="hidden lg:inline text-sm font-semibold tracking-tight">
              Volver
            </span>
          </button>

          {/* Formulario de Búsqueda: ajustado un 2% menor en escritorio */}
          <form
            onSubmit={handleSubmit}
            className="relative flex-1 lg:flex-initial lg:w-[665px] xl:w-[784px] flex items-center min-w-0"
          >
            <Search className="absolute left-4 w-4 h-4 lg:w-5 lg:h-5 text-slate-400 pointer-events-none shrink-0" />
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Buscar actividades por nombre, causa o lugar..."
              autoFocus
              className="w-full pl-11 pr-10 py-2.5 lg:py-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-sm lg:text-[15px] text-slate-900 placeholder:text-slate-400 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6355de]/20 focus:border-[#6355de] transition-all"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={onClearQuery}
                aria-label="Limpiar búsqueda"
                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Lado derecho: Botón de Filtros siempre a la derecha */}
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={
            activeFiltersCount > 0
              ? `Abrir filtros (${activeFiltersCount} activos)`
              : "Abrir filtros"
          }
          title="Abrir filtros"
          className={`relative h-10 lg:h-11 w-10 lg:w-auto px-0 lg:px-4 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeFiltersCount > 0
              ? "bg-[#6355de] text-white shadow-md shadow-[#6355de]/30 hover:bg-[#5244cc] active:scale-95"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
          }`}
        >
          <ListFilter className="w-4 h-4 lg:w-4.5 lg:h-4.5 shrink-0" />
          <span className="hidden lg:inline text-sm font-semibold tracking-tight">
            Filtros
          </span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 lg:static lg:ml-0.5 min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white lg:ring-0">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
