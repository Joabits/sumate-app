import { Users } from "lucide-react";
import type {
  ActivityListItem,
  ActivityScope,
  MyActivityListItem,
} from "@/activities/context/activitiesTypes";
import { ActivityCardShell } from "./ActivityCardShell";

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
          className: "bg-aviso-suave text-aviso-fuerte border border-aviso-borde/70",
        };
      case "active":
        return {
          label: "Activa",
          className: "bg-exito-suave text-exito-fuerte border border-exito-borde/70",
        };
      case "closed":
        return {
          label: "Cerrada",
          className: "bg-superficie-alta text-texto-secundario border border-borde/70",
        };
      case "cancelled":
        return {
          label: "Cancelada",
          className: "bg-error-suave text-error-fuerte border border-error-borde/70",
        };
      default:
        return null;
    }
  };

  const statusBadge = getStatusBadge();
  const showStatusBadge = scope === "mine" || activity.status !== "active";
  const isMine = scope === "mine";
  const registeredCount = activity.registeredCount ?? 0;
  const availableSpots = Math.max(activity.capacity - registeredCount, 0);

  return (
    <ActivityCardShell
      activity={activity}
      priority={priority}
    >
      {activity.creatorName && !isMine && (
        <p className="text-xs text-texto-tenue">
          Por <span className="font-semibold text-texto-secundario">{activity.creatorName}</span>
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-exito-fuerte bg-exito-suave border border-exito-borde/80 px-2.5 py-1 rounded-lg">
          <Users className="w-3.5 h-3.5 text-exito shrink-0" />
          {isMine ? (
            <span>
              {registeredCount} / {activity.capacity} inscritos
            </span>
          ) : availableSpots === 0 ? (
            <span>Cupos llenos · lista de espera</span>
          ) : (
            <span>
              {availableSpots} {availableSpots === 1 ? "cupo disponible" : "cupos disponibles"}
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
