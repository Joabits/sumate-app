import { useState, useEffect } from "react";
import {
  Clock,
  Sparkles,
  Sunrise,
  Sun,
  Moon,
  X,
  Tag,
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  Users,
  Calendar,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import type {
  CapacityRangeFilter,
  DatePresetFilter,
  SearchFilterState,
  TimeOfDayFilter,
} from "@/features/activities/domain/entities/activity.entity";
import { useCausesStore } from "../../stores/causes.store";

interface ActivitySearchFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftFilters: SearchFilterState;
  onDraftFiltersChange: (updater: (prev: SearchFilterState) => SearchFilterState) => void;
  onApply: () => void;
  onReset: () => void;
}

const TIME_OF_DAY_OPTIONS: { id: TimeOfDayFilter; label: string; icon: typeof Clock }[] = [
  { id: "any", label: "Cualquier hora", icon: Clock },
  { id: "early_morning", label: "Madrugada", icon: Sparkles },
  { id: "morning", label: "Mañana", icon: Sunrise },
  { id: "afternoon", label: "Tarde", icon: Sun },
  { id: "night", label: "Noche", icon: Moon },
];

const DATE_PRESET_OPTIONS: { id: DatePresetFilter; label: string }[] = [
  { id: "upcoming", label: "Próximos" },
  { id: "starting_soon", label: "Comenzando pronto" },
  { id: "today", label: "Hoy" },
  { id: "tomorrow", label: "Mañana" },
  { id: "this_weekend", label: "Fin de semana" },
  { id: "next_week", label: "Próxima semana" },
  { id: "next_weekend", label: "Próximo fin de semana" },
];

const CAPACITY_RANGE_OPTIONS: { id: CapacityRangeFilter; label: string }[] = [
  { id: "any", label: "Cualquier tamaño" },
  { id: "1-9", label: "1 a 9 asistentes" },
  { id: "10-20", label: "10 a 20 asistentes" },
  { id: "gt-20", label: "Mayor a 20 asistentes" },
];

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: typeof Clock;
  badge?: string | number | null;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  icon: Icon,
  badge,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-b border-slate-100 last:border-b-0 pb-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-2 text-left group cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-colors shrink-0" />}
          <span className="text-sm font-bold text-slate-900 group-hover:text-[#6355de] transition-colors">
            {title}
          </span>
          {badge != null && (
            <span className="ml-1 text-[11px] font-semibold text-[#6355de] bg-[#f3f1fd] px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="pt-2 pb-1 transition-all">
          {children}
        </div>
      )}
    </div>
  );
}

const DEFAULT_SECTIONS_STATE = {
  timeOfDay: true,
  datePreset: true,
  causes: false,
  moreFilters: false,
};

export function ActivitySearchFiltersSheet({
  open,
  onOpenChange,
  draftFilters,
  onDraftFiltersChange,
  onApply,
  onReset,
}: ActivitySearchFiltersSheetProps) {
  const causes = useCausesStore((state) => state.causes);
  const [sections, setSections] = useState(DEFAULT_SECTIONS_STATE);

  useEffect(() => {
    if (!open) {
      setSections(DEFAULT_SECTIONS_STATE);
    }
  }, [open]);

  const toggleSection = (key: keyof typeof DEFAULT_SECTIONS_STATE) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllCausesSelected = draftFilters.causeIds.length === 0;

  const handleSelectTimeOfDay = (val: TimeOfDayFilter) => {
    onDraftFiltersChange((prev) => ({ ...prev, timeOfDay: val }));
  };

  const handleSelectDatePreset = (val: DatePresetFilter) => {
    onDraftFiltersChange((prev) => ({ ...prev, datePreset: val }));
  };

  const handleSelectCapacityRange = (val: CapacityRangeFilter) => {
    onDraftFiltersChange((prev) => ({ ...prev, capacityRange: val }));
  };

  const handleToggleCause = (causeId: string) => {
    onDraftFiltersChange((prev) => {
      const exists = prev.causeIds.includes(causeId);
      if (exists) {
        return {
          ...prev,
          causeIds: prev.causeIds.filter((id: string) => id !== causeId),
        };
      } else {
        return {
          ...prev,
          causeIds: [...prev.causeIds, causeId],
        };
      }
    });
  };

  const handleSelectAllCauses = () => {
    onDraftFiltersChange((prev) => ({ ...prev, causeIds: [] }));
  };

  const handleDistanceChange = (vals: number[]) => {
    if (vals && vals.length > 0) {
      onDraftFiltersChange((prev) => ({ ...prev, distanceKm: Math.round(vals[0]) }));
    }
  };

  const timeOfDayBadge =
    draftFilters.timeOfDay !== "any"
      ? TIME_OF_DAY_OPTIONS.find((o) => o.id === draftFilters.timeOfDay)?.label
      : null;

  const datePresetBadge =
    draftFilters.datePreset !== "upcoming"
      ? DATE_PRESET_OPTIONS.find((o) => o.id === draftFilters.datePreset)?.label
      : null;

  const causesBadge =
    draftFilters.causeIds.length > 0
      ? `${draftFilters.causeIds.length} seleccionada${draftFilters.causeIds.length > 1 ? "s" : ""}`
      : null;

  const moreFiltersActiveCount =
    (draftFilters.distanceKm < 50 ? 1 : 0) +
    (draftFilters.capacityRange !== "any" ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-w-md mx-auto rounded-t-3xl p-0 max-h-[85vh] flex flex-col bg-white overflow-hidden shadow-2xl border-t border-slate-100"
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header con título y botón de cierre */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="w-8" />
          <SheetTitle className="text-base font-bold text-slate-900 text-center">
            Filtros
          </SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar filtros"
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido con Scroll y Secciones Colapsables (Ley de Hick) */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-2">
          {/* Sección 1: Hora del día (Desplegada por defecto) */}
          <CollapsibleSection
            title="Hora del día"
            icon={Clock}
            isOpen={sections.timeOfDay}
            onToggle={() => toggleSection("timeOfDay")}
            badge={timeOfDayBadge}
          >
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {TIME_OF_DAY_OPTIONS.map((opt) => {
                const isSelected = draftFilters.timeOfDay === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTimeOfDay(opt.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#6355de] text-white border border-[#6355de] shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Sección 2: Fecha (Desplegada por defecto) */}
          <CollapsibleSection
            title="Fecha"
            icon={Calendar}
            isOpen={sections.datePreset}
            onToggle={() => toggleSection("datePreset")}
            badge={datePresetBadge}
          >
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {DATE_PRESET_OPTIONS.map((opt) => {
                const isSelected = draftFilters.datePreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectDatePreset(opt.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#6355de] text-white border border-[#6355de] shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Sección 3: Causas temáticas (Colapsada por defecto) */}
          <CollapsibleSection
            title="Causas temáticas"
            icon={Tag}
            isOpen={sections.causes}
            onToggle={() => toggleSection("causes")}
            badge={causesBadge}
          >
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={handleSelectAllCauses}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAllCausesSelected
                    ? "bg-[#6355de] text-white border border-[#6355de] shadow-sm"
                    : "bg-white text-slate-800 border border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>Todas</span>
              </button>

              {causes.map((cause) => {
                const isSelected = draftFilters.causeIds.includes(cause.id);
                return (
                  <button
                    key={cause.id}
                    type="button"
                    onClick={() => handleToggleCause(cause.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#6355de] text-white border border-[#6355de] shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Tag className="w-3 h-3 shrink-0" />
                    <span>{cause.name}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          {/* Sección 4: Más filtros (Colapsada por defecto: Distancia + Tamaño de asistentes) */}
          <CollapsibleSection
            title="Más filtros"
            icon={SlidersHorizontal}
            isOpen={sections.moreFilters}
            onToggle={() => toggleSection("moreFilters")}
            badge={moreFiltersActiveCount > 0 ? `${moreFiltersActiveCount} activos` : null}
          >
            <div className="pt-2 pb-1 space-y-5">
              {/* Sub-filtro 1: Distancia */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      Radio de distancia
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#6355de] bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-xs">
                    {draftFilters.distanceKm >= 50
                      ? "Cualquier distancia"
                      : `${Math.round(draftFilters.distanceKm)} km`}
                  </span>
                </div>
                <div className="px-1 pt-1">
                  <Slider
                    value={[Math.round(draftFilters.distanceKm)]}
                    onValueChange={handleDistanceChange}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
              </div>

              {/* Sub-filtro 2: Tamaño de asistentes */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    Tamaño de asistentes
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CAPACITY_RANGE_OPTIONS.map((opt) => {
                    const isSelected = draftFilters.capacityRange === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectCapacityRange(opt.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#6355de] text-white border border-[#6355de] shadow-sm"
                            : "bg-white text-slate-800 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer Fijo con Limpiar todo y Aplicar filtros */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-5 py-3.5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="text-slate-500 hover:text-slate-900 text-sm font-semibold py-2 px-1 cursor-pointer transition-colors"
          >
            Limpiar todo
          </button>
          <button
            type="button"
            onClick={onApply}
            className="bg-[#6355de] text-white hover:bg-[#5245c7] active:scale-95 font-semibold text-sm px-6 py-2.5 rounded-full shadow-md shadow-[#6355de]/20 cursor-pointer transition-all"
          >
            Aplicar filtros
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
