"use client";

import Image from "next/image";
import { Map, Pencil, Plus } from "lucide-react";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { useActivityDetailUiStore } from "../../stores/activity-detail-ui.store";
import { EditActivityTitleForm } from "../forms/edit-activity-title-form";
import { EditActivityDateForm } from "../forms/edit-activity-date-form";
import { EditActivityCapacityForm } from "../forms/edit-activity-capacity-form";
import { EditActivityCausesForm } from "../forms/edit-activity-causes-form";

type ActivityDetailInfoProps = {
  activity: ActivityDetailData;
};

function formatDetailedDate(dateString: string): { fullDate: string; time: string } {
  try {
    const isoString =
      dateString.includes("Z") || dateString.includes("+") || dateString.includes("-", 10)
        ? dateString
        : `${dateString}Z`;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { fullDate: dateString, time: "" };

    const weekday = d.toLocaleDateString("es-BO", {
      timeZone: "America/La_Paz",
      weekday: "long",
    });
    const day = d.toLocaleDateString("es-BO", {
      timeZone: "America/La_Paz",
      day: "numeric",
    });
    const month = d.toLocaleDateString("es-BO", {
      timeZone: "America/La_Paz",
      month: "long",
    });
    const year = d.toLocaleDateString("es-BO", {
      timeZone: "America/La_Paz",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("es-BO", {
      timeZone: "America/La_Paz",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return {
      fullDate: `${capWeekday}, ${day} de ${month} ${year}`,
      time,
    };
  } catch {
    return { fullDate: dateString, time: "" };
  }
}

function getGoogleCalendarUrl(
  title: string,
  dateString: string,
  description?: string | null,
  location?: string | null
): string {
  try {
    const isoString =
      dateString.includes("Z") || dateString.includes("+") || dateString.includes("-", 10)
        ? dateString
        : `${dateString}Z`;
    const start = new Date(isoString);
    if (isNaN(start.getTime())) return "#";

    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const formatIsoForGCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const dates = `${formatIsoForGCal(start)}/${formatIsoForGCal(end)}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates,
      ...(description ? { details: description } : {}),
      ...(location ? { location } : {}),
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return "#";
  }
}

function toLocalDatetimeString(dateString: string): string {
  try {
    const iso =
      dateString.includes("Z") || dateString.includes("+") || dateString.includes("-", 10)
        ? dateString
        : `${dateString}Z`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";

    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export function ActivityDetailInfo({
  activity,
}: ActivityDetailInfoProps) {
  const { id: activityId, name, date, capacity, isOwner, detail } = activity;
  const { isEditMode, activeField, setActiveField, openLocationSheet } =
    useActivityDetailUiStore();

  const { fullDate, time } = formatDetailedDate(date);
  const enrolledCount = activity.participants?.length ?? 0;

  const googleMapsUrl =
    detail?.latitude != null && detail?.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`
      : detail?.address || detail?.place
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((detail.address || detail.place)!)}`
        : "#";

  const googleCalendarUrl = getGoogleCalendarUrl(
    name,
    date,
    detail?.description,
    detail?.address ?? detail?.place
  );

  const isOtherFieldActive = (field: string) =>
    activeField !== null && activeField !== field;

  return (
    <>
      {/* Título de la actividad */}
      <div className="mb-6" data-purpose="event-title-section">
        {activeField === "title" ? (
          <EditActivityTitleForm
            activityId={activityId}
            initialTitle={name}
            onCancel={() => setActiveField(null)}
            onSuccess={() => setActiveField(null)}
          />
        ) : (
          <div>
            <h1 className="text-2xl sm:text-[1.65rem] font-extrabold text-slate-900 leading-snug tracking-tight">
              {name}
              {isOwner && isEditMode && (
                <button
                  type="button"
                  onClick={() => setActiveField("title")}
                  disabled={isOtherFieldActive("title")}
                  title="Editar título"
                  aria-label="Editar título"
                  className={`inline-flex items-center justify-center align-middle ml-2.5 p-1.5 rounded-full transition-all cursor-pointer ${
                    isOtherFieldActive("title")
                      ? "opacity-30 cursor-not-allowed text-slate-300"
                      : "text-slate-500 hover:text-[#6355de] hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </h1>
          </div>
        )}
      </div>

      {/* Lista de información clave (Fecha, Cupos, Ubicación) */}
      <section className="space-y-4 mb-7" data-purpose="key-event-information">
        {/* Fila: Fecha y Hora */}
        {activeField === "date" ? (
          <EditActivityDateForm
            activityId={activityId}
            initialDate={toLocalDatetimeString(date)}
            onCancel={() => setActiveField(null)}
            onSuccess={() => setActiveField(null)}
          />
        ) : (
          <div className="flex items-center justify-between pb-4 border-b border-slate-100/90">
            <div className="flex items-center flex-1 mr-2">
              <div className="shrink-0 flex items-center justify-center mr-6">
                <Image
                  src="/assets/icons/date.webp"
                  alt="Fecha"
                  width={34}
                  height={34}
                  unoptimized
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {fullDate}
                </p>
                {time && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{time}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {isOwner && isEditMode ? (
                <button
                  type="button"
                  onClick={() => setActiveField("date")}
                  disabled={isOtherFieldActive("date")}
                  aria-label="Editar fecha"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isOtherFieldActive("date")
                      ? "opacity-30 cursor-not-allowed text-slate-300"
                      : "text-slate-400 hover:text-[#6355de] hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Añadir fecha al calendario de Google"
                  title="Añadir a Google Calendar"
                  className="text-slate-400 hover:text-[#6355de] transition-colors p-2 rounded-full hover:bg-slate-50 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Fila: Cupos */}
        {activeField === "capacity" ? (
          <EditActivityCapacityForm
            activityId={activityId}
            initialCapacity={capacity}
            onCancel={() => setActiveField(null)}
            onSuccess={() => setActiveField(null)}
          />
        ) : (
          <div className="flex items-center justify-between pb-4 border-b border-slate-100/90">
            <div className="flex items-center flex-1 mr-2">
              <div className="shrink-0 flex items-center justify-center mr-6">
                <Image
                  src="/assets/icons/capacity.webp"
                  alt="Cupos"
                  width={34}
                  height={34}
                  unoptimized
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  Cupos disponibles
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {enrolledCount} / {capacity} {capacity === 1 ? "cupo reservado" : "cupos reservados"}
                </p>
              </div>
            </div>

            {isOwner && isEditMode && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveField("capacity")}
                  disabled={isOtherFieldActive("capacity")}
                  aria-label="Editar cupos"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isOtherFieldActive("capacity")
                      ? "opacity-30 cursor-not-allowed text-slate-300"
                      : "text-slate-400 hover:text-[#6355de] hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fila: Causas temáticas */}
        {activeField === "causes" ? (
          <EditActivityCausesForm
            activityId={activityId}
            initialCauses={activity.causes || []}
            activityStatus={activity.status}
            onCancel={() => setActiveField(null)}
            onSuccess={() => setActiveField(null)}
          />
        ) : (
          <div className="flex items-center justify-between pb-4 border-b border-slate-100/90">
            <div
              className={`flex items-center flex-1 mr-2 ${
                isOwner && isEditMode && !isOtherFieldActive("causes") ? "cursor-pointer" : ""
              }`}
              onClick={
                isOwner && isEditMode && !isOtherFieldActive("causes")
                  ? () => setActiveField("causes")
                  : undefined
              }
            >
              <div className="shrink-0 flex items-center justify-center mr-6">
                <Image
                  src="/assets/icons/cause.webp"
                  alt="Causas"
                  width={34}
                  height={34}
                  unoptimized
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {activity.causes && activity.causes.length > 0
                    ? "Causas temáticas"
                    : isOwner
                      ? "Causas por definir"
                      : "Causas temáticas"}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {activity.causes && activity.causes.length > 0
                    ? activity.causes.map((cause) => cause.name).join(", ")
                    : isOwner
                      ? isEditMode
                        ? "Toca para seleccionar causas"
                        : "Activa el modo de edición"
                      : "Sin causas"}
                </p>
              </div>
            </div>

            {isOwner && isEditMode && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveField("causes")}
                  disabled={isOtherFieldActive("causes")}
                  aria-label="Editar causas"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isOtherFieldActive("causes")
                      ? "opacity-30 cursor-not-allowed text-slate-300"
                      : "text-slate-400 hover:text-[#6355de] hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fila: Ubicación */}
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center pr-2 ${
              isOwner && isEditMode ? "cursor-pointer" : ""
            }`}
            onClick={isOwner && isEditMode ? openLocationSheet : undefined}
          >
            <div className="shrink-0 flex items-center justify-center mr-6">
              <Image
                src="/assets/icons/ubication.webp"
                alt="Ubicación"
                width={34}
                height={34}
                unoptimized
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="pr-2">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {detail?.place?.trim() || "Ubicación por definir"}
              </p>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[210px] sm:max-w-xs mt-0.5">
                {detail?.address?.trim()
                  ? detail.address
                  : isOwner
                    ? isEditMode
                      ? "Toca para fijar en el mapa"
                      : "Activa el modo de edición"
                    : "Sin detalles de dirección"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {isOwner && isEditMode ? (
              <button
                type="button"
                onClick={openLocationSheet}
                disabled={isOtherFieldActive("location")}
                aria-label="Editar ubicación en mapa"
                title="Editar ubicación en mapa"
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isOtherFieldActive("location")
                    ? "opacity-30 cursor-not-allowed text-slate-300"
                    : "text-slate-400 hover:text-[#6355de] hover:bg-slate-100"
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : googleMapsUrl !== "#" ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ver mapa en Google Maps"
                title="Abrir en Google Maps"
                className="text-slate-400 hover:text-[#6355de] transition-colors p-2 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <Map className="w-5 h-5" />
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
