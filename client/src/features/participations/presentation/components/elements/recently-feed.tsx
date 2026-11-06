"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { ActivityCardShell } from "@/features/activities/presentation/components/elements/activity-card-shell";
import {
  NOMBRE_ESTADO_SOLICITUD,
  type EstadoSolicitud,
} from "@/features/activities/domain/entities/activity.entity";
import type { ParticipatedActivityListItem } from "@/features/participations/domain/entities/participation.entity";

type RecentlyFeedProps = {
  participations: ParticipatedActivityListItem[];
};

type Seccion = "proximas" | "historial";

type Grupo = {
  id: string;
  titulo: string;
  items: ParticipatedActivityListItem[];
};

// Mismo nombre del estado que en el detalle de la actividad y en los mensajes
const ETIQUETA_ESTADO: Record<EstadoSolicitud, { texto: string; clase: string }> = {
  aceptada: {
    texto: "Solicitud aceptada",
    clase: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  },
  pendiente: {
    texto: "Solicitud pendiente",
    clase: "bg-amber-50 text-amber-700 border-amber-200/70",
  },
  en_espera: {
    texto: "En lista de espera",
    clase: "bg-sky-50 text-sky-800 border-sky-200/70",
  },
  rechazada: {
    texto: "Solicitud rechazada",
    clase: "bg-rose-50 text-rose-700 border-rose-200/70",
  },
  cancelada: {
    texto: "Cancelada",
    clase: "bg-rose-50 text-rose-700 border-rose-200/70",
  },
};

const REALIZADA = {
  texto: "Realizada",
  clase: "bg-slate-100 text-slate-600 border-slate-200/70",
};

// Próximas: lo que todavía puede pasar, agrupado por la respuesta del organizador
function gruposProximas(items: ParticipatedActivityListItem[]): Grupo[] {
  const proximas = items.filter((i) => !i.isPast && i.estadoSolicitud !== "cancelada");
  const de = (estado: EstadoSolicitud) => proximas.filter((i) => i.estadoSolicitud === estado);
  return [
    { id: "aceptadas", titulo: "Aceptadas", items: de("aceptada") },
    { id: "pendientes", titulo: "Pendientes de respuesta", items: de("pendiente") },
    { id: "en-espera", titulo: "En lista de espera", items: de("en_espera") },
    { id: "rechazadas", titulo: "Rechazadas", items: de("rechazada") },
  ];
}

// Historial: lo que ya terminó o la organización canceló
function gruposHistorial(items: ParticipatedActivityListItem[]): Grupo[] {
  return [
    {
      id: "canceladas",
      titulo: "Canceladas por la organización",
      items: items.filter((i) => i.estadoSolicitud === "cancelada"),
    },
    {
      id: "realizadas",
      titulo: "Realizadas",
      items: items.filter((i) => i.isPast && i.estadoSolicitud === "aceptada"),
    },
    {
      id: "sin-participar",
      titulo: "Pasaron sin que participaras",
      items: items.filter(
        (i) => i.isPast && i.estadoSolicitud !== "aceptada" && i.estadoSolicitud !== "cancelada",
      ),
    },
  ];
}

export function RecentlyFeed({ participations }: RecentlyFeedProps) {
  const [seccion, setSeccion] = useState<Seccion>("proximas");

  const grupos = (seccion === "proximas" ? gruposProximas : gruposHistorial)(participations)
    .filter((g) => g.items.length > 0);

  const pestanas: { id: Seccion; texto: string; total: number }[] = [
    {
      id: "proximas",
      texto: "Próximas",
      total: gruposProximas(participations).reduce((n, g) => n + g.items.length, 0),
    },
    {
      id: "historial",
      texto: "Historial",
      total: gruposHistorial(participations).reduce((n, g) => n + g.items.length, 0),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full" data-purpose="recently-feed-wrapper">
      <div className="pt-4 lg:pt-5 shrink-0">
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
          Mis solicitudes
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          El estado de cada actividad a la que pediste sumarte.
        </p>

        {/* Secciones de la página; no son filtros de la lista */}
        <div
          role="tablist"
          aria-label="Secciones de Mis solicitudes"
          className="mt-3 flex gap-6 border-b border-slate-200"
        >
          {pestanas.map((p) => {
            const activa = seccion === p.id;
            return (
              <button
                key={p.id}
                id={`pestana-${p.id}`}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls={`panel-${p.id}`}
                onClick={() => setSeccion(p.id)}
                className={`-mb-px h-11 flex items-center gap-2 border-b-2 text-sm font-semibold transition-colors cursor-pointer ${
                  activa
                    ? "border-[#6355de] text-[#4f43c4]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.texto}
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    activa ? "bg-[#ece9fc] text-[#4f43c4]" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {p.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`panel-${seccion}`}
        role="tabpanel"
        aria-labelledby={`pestana-${seccion}`}
        className="flex-1 overflow-y-auto no-scrollbar pt-4 pb-24 lg:pb-12"
        data-purpose="recently-feed-scroll"
      >
        {participations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-800">Sin participaciones</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-xs leading-relaxed">
              Aún no te has sumado a ninguna actividad. ¡Explora y participa!
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-semibold text-white bg-[#6355de] hover:bg-[#5244cc] active:scale-95 transition-all"
            >
              Explorar actividades
            </Link>
          </div>
        ) : grupos.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            {seccion === "proximas"
              ? "No tienes solicitudes para actividades próximas."
              : "Todavía no tienes actividades en el historial."}
          </p>
        ) : (
          <div className="space-y-7">
            {grupos.map((grupo) => (
              <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`}>
                <h2
                  id={`grupo-${grupo.id}`}
                  className="mb-3 text-sm font-bold text-slate-800 flex items-center gap-2"
                >
                  {grupo.titulo}
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {grupo.items.length}
                  </span>
                </h2>
                <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6">
                  {grupo.items.map((item, index) => {
                    const etiqueta =
                      item.isPast && item.estadoSolicitud === "aceptada"
                        ? REALIZADA
                        : ETIQUETA_ESTADO[item.estadoSolicitud];
                    return (
                      <ActivityCardShell key={item.id} activity={item} priority={index < 3}>
                        <div className="mt-1 flex items-center justify-between text-xs gap-2">
                          {item.creatorName ? (
                            <p className="text-xs text-slate-500 truncate">
                              Por <span className="font-semibold text-slate-700">{item.creatorName}</span>
                            </p>
                          ) : (
                            <div />
                          )}
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${etiqueta.clase}`}
                          >
                            {etiqueta.texto}
                          </span>
                        </div>
                        {item.estadoSolicitud === "cancelada" && (
                          <p className="mt-2 text-xs leading-snug text-rose-900 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
                            {`Cancelada por la organización${
                              item.estadoAnterior
                                ? ` (estabas: ${NOMBRE_ESTADO_SOLICITUD[item.estadoAnterior].toLowerCase()})`
                                : ""
                            }. Motivo: ${item.motivoCancelacion ?? "sin motivo"}`}
                          </p>
                        )}
                      </ActivityCardShell>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
