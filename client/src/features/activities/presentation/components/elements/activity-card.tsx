import { Tag, Users } from "lucide-react";
import type {
  ActivityListItem,
  ActivityScope,
  MyActivityListItem,
} from "@/features/activities/domain/entities/activity.entity";
import { ActivityCardShell } from "./activity-card-shell";

type ActivityCardProps = {
  activity: ActivityListItem | MyActivityListItem;
  scope?: ActivityScope;
  priority?: boolean;
};

export function ActivityCard({ activity, scope, priority = false }: ActivityCardProps) {
  const getStatusBadge = () => {
    switch (activity.status) {
      case "draft":
        return {
          label: "Borrador",
          className: "bg-amber-50 text-amber-700 border border-amber-200/70",
        };
      case "active":
        return {
          label: "Activa",
          className: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
        };
      case "closed":
        return {
          label: "Cerrada",
          className: "bg-slate-100 text-slate-600 border border-slate-200/70",
        };
      default:
        return null;
    }
  };

  const statusBadge = getStatusBadge();
  const showStatusBadge = scope === "mine" || activity.status !== "active";
  const myActivity = activity as MyActivityListItem;
  const isMine = scope === "mine";

  return (
    <ActivityCardShell
      activity={activity}
      priority={priority}
    >
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">
          {activity.causes && activity.causes.length > 0
            ? activity.causes.map((cause) => cause.name).join(", ")
            : "Sin causas"}
        </span>
      </div>

      {activity.creatorName && !isMine && (
        <p className="mt-1 text-xs text-slate-500">
          Por <span className="font-semibold text-slate-700">{activity.creatorName}</span>
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {isMine && typeof myActivity.registeredCount === "number" ? (
            <span>
              {myActivity.registeredCount} / {activity.capacity} inscritos
            </span>
          ) : (
            <span>
              {activity.capacity} {activity.capacity === 1 ? "cupo disponible" : "cupos disponibles"}
            </span>
          )}
        </div>

        {showStatusBadge && statusBadge && (
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        )}
      </div>
    </ActivityCardShell>
  );
}
