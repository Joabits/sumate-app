"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight, Users } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { AppSheet } from "@/features/shared/presentation/components/dialogs/app-sheet";

type ActivityDetailParticipantsProps = {
  activity: ActivityDetailData;
};

export function ActivityDetailParticipants({
  activity,
}: ActivityDetailParticipantsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const participants = activity.participants ?? [];
  const firstThree = participants.slice(0, 3);

  return (
    <section
      className="mt-6 pt-5 border-t border-slate-100"
      data-purpose="event-participants-section"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Participantes
        </h3>
        {participants.length > 0 && (
          <span className="text-xs font-medium text-[#6355de]">
            Ver lista
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 active:scale-[0.99] transition-all border border-slate-100 group text-left cursor-pointer"
        aria-label="Ver participantes de la actividad"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6355de] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-snug">
              {participants.length === 0
                ? "Sin participantes aún"
                : `${participants.length} ${
                    participants.length === 1
                      ? "participante confirmado"
                      : "participantes confirmados"
                  }`}
            </p>
            <p className="text-xs text-slate-500">
              {participants.length === 0
                ? "Sé la primera persona en sumarte"
                : `Capacidad total: ${activity.capacity}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {participants.length > 0 && (
            <div className="flex items-center -space-x-2.5 overflow-hidden">
              {firstThree.map((p) => {
                const initial = (p.name || "U").charAt(0).toUpperCase();
                return p.image ? (
                  <div
                    key={p.id}
                    className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white bg-slate-100 shrink-0"
                  >
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    key={p.id}
                    className="w-8 h-8 rounded-full bg-indigo-100 ring-2 ring-white flex items-center justify-center text-[#6355de] font-bold text-xs shrink-0"
                  >
                    {initial}
                  </div>
                );
              })}
              {participants.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-slate-600 font-semibold text-[11px] shrink-0">
                  +{participants.length - 3}
                </div>
              )}
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>
      </button>

      {/* AppSheet adaptativo (bottom sheet en móvil, side right sheet en desktop) */}
      <AppSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Participantes de la actividad"
        description={
          participants.length === 0
            ? "Ningún voluntario se ha inscrito aún"
            : `${participants.length} ${
                participants.length === 1
                  ? "voluntario confirmado"
                  : "voluntarios confirmados"
              }`
        }
        showHeader
        showCloseButton
      >
        {participants.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Aún no hay participantes
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Las personas que se unan a esta actividad aparecerán aquí en orden de inscripción.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 py-1">
            {participants.map((p, index) => {
              const initial = (p.name || "U").charAt(0).toUpperCase();
              return (
                <li
                  key={p.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6355de] font-bold text-sm shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Voluntario #{index + 1}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full shrink-0">
                    Confirmado
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </AppSheet>
    </section>
  );
}
