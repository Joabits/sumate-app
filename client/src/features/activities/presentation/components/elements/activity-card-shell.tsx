import { type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Tag } from "lucide-react";
import type { Cause } from "@/features/activities/domain/entities/activity.entity";

export function formatActivityDate(dateString: string): string {
  try {
    const isoString =
      dateString.includes("Z") || dateString.includes("+") || dateString.includes("-", 10)
        ? dateString
        : `${dateString}Z`;

    const d = new Date(isoString);
    if (isNaN(d.getTime())) return dateString;

    const weekday = d.toLocaleDateString("es-BO", { timeZone: "America/La_Paz", weekday: "short" });
    const day = d.toLocaleDateString("es-BO", { timeZone: "America/La_Paz", day: "numeric" });
    const month = d.toLocaleDateString("es-BO", { timeZone: "America/La_Paz", month: "short" });
    const time = d.toLocaleTimeString("es-BO", {
      timeZone: "America/La_Paz",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capWeekday}, ${day} ${month} • ${time}`;
  } catch {
    return dateString;
  }
}

export type ActivityCardCore = {
  id: string;
  name: string;
  imageUrl: string;
  date: string;
  causes?: Cause[];
};

export type ActivityCardShellProps = {
  activity: ActivityCardCore;
  badge?: ReactNode;
  children?: ReactNode;
  priority?: boolean;
};

export function ActivityCardShell({
  activity,
  badge,
  children,
  priority = false,
}: ActivityCardShellProps) {
  const { id, name, imageUrl, date, causes } = activity;
  const formattedDate = formatActivityDate(date);

  return (
    <Link
      href={`/activities/${id}`}
      className="block group pb-3 mb-3 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0 lg:border-none lg:p-0 lg:mb-0 lg:pb-0 transition-all"
    >
      <article
        className="transition-transform active:scale-[0.99] text-left flex flex-col h-full"
        data-purpose="activity-card-shell"
      >
        <div className="relative w-full h-44 lg:h-52 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
          <Image
            src={imageUrl}
            alt={name}
            fill
            priority={priority}
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
            className="object-cover group-hover:scale-102 transition-transform duration-200"
          />
          {badge && (
            <div className="absolute top-2.5 right-2.5 z-10">
              {badge}
            </div>
          )}
        </div>

        <div className="pt-3 px-1 flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#6355de] transition-colors">
              {name}
            </h2>

            <p className="mt-1 text-xs font-semibold text-[#6355de] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#6355de] shrink-0" />
              <span>{formattedDate}</span>
            </p>

            {/* Causas temáticas integradas uniformemente en el shell */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#6355de]">
              <Tag className="w-3.5 h-3.5 text-[#6355de]/80 shrink-0" />
              <span className="truncate font-medium">
                {causes && causes.length > 0
                  ? causes.map((c) => c.name).join(", ")
                  : "Sin causas"}
              </span>
            </div>
          </div>

          <div className="mt-2">
            {children}
          </div>
        </div>
      </article>
    </Link>
  );
}

