import { ActivitiesFeed } from "@/activities/components/ActivitiesFeed";
import { ActivitiesListSkeleton } from "@/activities/components/ActivitiesListSkeleton";
import { CreateActivitySheet } from "@/activities/components/CreateActivitySheet";
import { useActivities } from "@/activities/hooks/useActivities";
import { getMyActivitiesQuery } from "@/api/activitiesQueries";
import { ErrorView } from "@/shared/components/ErrorView";
import { usePageData } from "@/shared/hooks/usePageData";

export default function MyActivitiesPage() {
  const { dataVersion } = useActivities();
  const { data: activities, error } = usePageData(getMyActivitiesQuery, [dataVersion]);

  if (error) return <ErrorView error={error} />;
  if (!activities) return <ActivitiesListSkeleton />;

  return (
    <>
      <ActivitiesFeed
        activities={activities}
        scope="mine"
        emptyTitle="Aún no has creado actividades"
        emptyMessage="Toca el botón '+ Crear actividad' para publicar tu primera iniciativa solidaria."
      />
      <CreateActivitySheet />
    </>
  );
}
