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
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md -mx-5 px-5 pt-4 pb-2"
      data-purpose="activity-search-header"
    >
      <div className="flex items-center gap-2.5">
        {/* Botón Volver Atrás (redirige a /explore) */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver a explorar"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
        >
          <ChevronLeft className="w-5 h-5 -ml-0.5" />
        </button>

        {/* Formulario de Búsqueda Centrado (Soporta Enter físico y botón de teclado móvil) */}
        <form
          onSubmit={handleSubmit}
          className="relative flex-1 flex items-center"
        >
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none shrink-0" />
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
            placeholder="Buscar actividades..."
            autoFocus
            className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6355de]/20 focus:border-[#6355de] transition-all"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={onClearQuery}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Botón de Filtros */}
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={
            activeFiltersCount > 0
              ? `Abrir filtros (${activeFiltersCount} activos)`
              : "Abrir filtros"
          }
          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            activeFiltersCount > 0
              ? "bg-[#6355de] text-white shadow-md shadow-[#6355de]/30 hover:bg-[#5244cc] active:scale-95"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
          }`}
        >
          <ListFilter className="w-4 h-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
