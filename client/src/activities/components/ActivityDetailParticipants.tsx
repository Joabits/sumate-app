import { useState } from "react";
import Image from "@/shared/components/Image";
import { ChevronRight, Users } from "lucide-react";
import { AppSheet } from "@/shared/components/AppSheet";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";

export function ActivityDetailParticipants() {
  const { activity } = useActivityDetail();
  const [isOpen, setIsOpen] = useState(false);
  const participants = activity.participants ?? [];
  const firstThree = participants.slice(0, 3);

  return (
    <section
      className="mt-6 pt-5 border-t border-borde-suave"
      data-purpose="event-participants-section"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wider text-texto-tenue uppercase">
          Participantes
        </h3>
        {participants.length > 0 && (
          <span className="text-xs font-medium text-accion">
            Ver lista
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-superficie hover:bg-superficie-alta/80 active:scale-[0.99] transition-all border border-borde-suave group text-left cursor-pointer"
        aria-label="Ver participantes de la actividad"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accion-suave border border-accion-suave flex items-center justify-center text-accion shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-texto leading-snug">
              {participants.length === 0
                ? "Sin participantes aún"
                : `${participants.length} ${
                    participants.length === 1
                      ? "participante confirmado"
                      : "participantes confirmados"
                  }`}
            </p>
            <p className="text-xs text-texto-tenue">
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
                    className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-fondo bg-superficie-alta shrink-0"
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
                    className="w-8 h-8 rounded-full bg-accion-suave ring-2 ring-fondo flex items-center justify-center text-accion font-bold text-xs shrink-0"
                  >
                    {initial}
                  </div>
                );
              })}
              {participants.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-superficie-hover ring-2 ring-fondo flex items-center justify-center text-texto-secundario font-semibold text-[11px] shrink-0">
                  +{participants.length - 3}
                </div>
              )}
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-texto-tenue group-hover:text-texto-secundario transition-colors shrink-0" />
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
            <div className="w-14 h-14 rounded-full bg-superficie-alta flex items-center justify-center text-texto-tenue mb-3">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-texto">
              Aún no hay participantes
            </p>
            <p className="text-xs text-texto-tenue mt-1 max-w-xs">
              Las personas que se unan a esta actividad aparecerán aquí en orden de inscripción.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-borde-suave py-1">
            {participants.map((p, index) => {
              const initial = (p.name || "U").charAt(0).toUpperCase();
              return (
                <li
                  key={p.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.image ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-superficie-alta shrink-0 border border-borde">
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
                      <div className="w-10 h-10 rounded-full bg-accion-suave border border-accion-suave flex items-center justify-center text-accion font-bold text-sm shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-texto truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-texto-tenue">
                        Voluntario #{index + 1}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium bg-exito-suave text-exito-fuerte px-2.5 py-0.5 rounded-full shrink-0">
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
