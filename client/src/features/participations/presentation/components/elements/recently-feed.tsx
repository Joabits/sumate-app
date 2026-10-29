"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { ActivityCardShell } from "@/features/activities/presentation/components/elements/activity-card-shell";
import {
  ActivitiesFilterBar,
  type FilterOption,
} from "@/features/activities/presentation/components/elements/activities-filter-bar";
import type {
  ParticipatedActivityListItem,
  ParticipationFilter,
} from "@/features/participations/domain/entities/participation.entity";

type RecentlyFeedProps = {
  participations: ParticipatedActivityListItem[];
};

const FILTER_OPTIONS: FilterOption<ParticipationFilter>[] = [
  { id: "all", label: "Todas" },
  { id: "upcoming", label: "Próximas" },
  { id: "past", label: "Realizadas" },
];

export function RecentlyFeed({ participations }: RecentlyFeedProps) {
  const [activeFilter, setActiveFilter] = useState<ParticipationFilter>("all");

  const filteredParticipations = useMemo(() => {
    if (activeFilter === "upcoming") {
      return participations.filter((item) => !item.isPast);
    }
    if (activeFilter === "past") {
      return participations.filter((item) => item.isPast);
    }
    return participations;
  }, [participations, activeFilter]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full" data-purpose="recently-feed-wrapper">
      <ActivitiesFilterBar<ParticipationFilter>
        options={FILTER_OPTIONS}
        activeId={activeFilter}
        onChange={setActiveFilter}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pt-3 pb-24 lg:pb-12" data-purpose="recently-feed-scroll">
        {filteredParticipations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-800">Sin participaciones</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-xs leading-relaxed">
              Aún no te has sumado a ninguna actividad. ¡Explora y participa!
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6">
            {filteredParticipations.map((item, index) => (
              <ActivityCardShell
                key={item.id}
                activity={item}
                priority={index < 3}
              >
                <div className="mt-1 flex items-center justify-between text-xs gap-2">
                  {item.creatorName ? (
                    <p className="text-xs text-slate-500 truncate">
                      Por <span className="font-semibold text-slate-700">{item.creatorName}</span>
                    </p>
                  ) : (
                    <div />
                  )}

                  {item.participationStatus === "pending" ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                      Solicitud pendiente
                    </span>
                  ) : item.participationStatus === "rejected" ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
                      Solicitud rechazada
                    </span>
                  ) : item.isPast ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70">
                      Realizada
                    </span>
                  ) : (
                    <span className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                      Próxima
                    </span>
                  )}
                </div>
              </ActivityCardShell>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
