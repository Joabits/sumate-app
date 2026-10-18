"use client";

import { useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import type {
  ActivityListItem,
  ActivityScope,
  MyActivityListItem,
} from "@/features/activities/domain/entities/activity.entity";
import { ActivityCard } from "./activity-card";
import { ActivitiesFilterBar, type FilterOption } from "./activities-filter-bar";

type ActivitiesFeedProps = {
  activities: (ActivityListItem | MyActivityListItem)[];
  scope?: ActivityScope;
  emptyTitle?: string;
  emptyMessage?: string;
};

const EXPLORE_FILTERS: FilterOption[] = [
  { id: "all", label: "Próximos" },
  { id: "today", label: "Hoy" },
  { id: "tomorrow", label: "Mañana" },
  { id: "weekend", label: "Fin de semana" },
];

const MINE_FILTERS: FilterOption[] = [
  { id: "all", label: "Todas" },
  { id: "draft", label: "Borrador" },
  { id: "active", label: "Activas" },
  { id: "closed", label: "Cerradas" },
];

function parseActivityDate(dateString: string): Date {
  const iso =
    dateString.includes("Z") || dateString.includes("+") || dateString.includes("-", 10)
      ? dateString
      : `${dateString}Z`;
  return new Date(iso);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function ActivitiesFeed({
  activities,
  scope = "others",
  emptyTitle,
  emptyMessage,
}: ActivitiesFeedProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filterOptions = scope === "mine" ? MINE_FILTERS : EXPLORE_FILTERS;

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return activities;

    const now = new Date();

    if (scope === "mine") {
      return activities.filter((a) => a.status === activeFilter);
    }

    // scope === "others" (explore)
    return activities.filter((a) => {
      const actDate = parseActivityDate(a.date);
      if (isNaN(actDate.getTime())) return false;

      if (activeFilter === "today") {
        return isSameDay(actDate, now);
      }

      if (activeFilter === "tomorrow") {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return isSameDay(actDate, tomorrow);
      }

      if (activeFilter === "weekend") {
        const dayOfWeek = actDate.getDay();
        const isSatOrSun = dayOfWeek === 0 || dayOfWeek === 6;
        if (!isSatOrSun) return false;

        const diffTime = actDate.getTime() - now.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        return diffDays >= -1 && diffDays <= 7;
      }

      return true;
    });
  }, [activities, activeFilter, scope]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full" data-purpose="activities-feed-wrapper">
      {/* Barra de Filtros Estática */}
      <ActivitiesFilterBar
        options={filterOptions}
        activeId={activeFilter}
        onChange={setActiveFilter}
      />

      {/* Contenedor de Scroll de Tarjetas: En móvil/tablet lista vertical; en desktop (>= lg) cuadrícula de 3 columnas */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-3 pb-24 lg:pb-12" data-purpose="activities-feed-scroll">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <CalendarX className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-800">
              {emptyTitle || (scope === "mine" ? "No se encontraron actividades" : "Sin actividades próximas")}
            </h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-xs leading-relaxed">
              {emptyMessage || "No hay iniciativas que coincidan con el filtro seleccionado."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6">
            {filteredActivities.map((activity, index) => (
              <ActivityCard key={activity.id} activity={activity} scope={scope} priority={index < 3} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
