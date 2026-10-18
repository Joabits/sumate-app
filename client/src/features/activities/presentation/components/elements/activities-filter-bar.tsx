"use client";

export type FilterOption<T extends string = string> = {
  id: T;
  label: string;
};

type ActivitiesFilterBarProps<T extends string = string> = {
  options: FilterOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
};

export function ActivitiesFilterBar<T extends string = string>({
  options,
  activeId,
  onChange,
}: ActivitiesFilterBarProps<T>) {
  return (
    <div
      role="group"
      aria-label="Filtros de actividades"
      className="flex items-center justify-start gap-3.5 lg:gap-4.5 overflow-x-auto no-scrollbar pt-4 pb-3.5 lg:pt-5 lg:pb-4 border-b border-slate-100/80 px-1 bg-white shrink-0"
    >
      {options.map((option) => {
        const isActive = activeId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`px-4 py-2 rounded-full text-xs lg:text-[13px] font-semibold transition-all shrink-0 cursor-pointer ${
              isActive
                ? "bg-[#6355de] text-white shadow-xs shadow-[#6355de]/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
