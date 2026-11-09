import { ActivitiesFeed } from "@/activities/components/ActivitiesFeed";
import { ActivitiesListSkeleton } from "@/activities/components/ActivitiesListSkeleton";
import { CreateActivitySheet } from "@/activities/components/CreateActivitySheet";
import { useActivities } from "@/activities/hooks/useActivities";
import { getExploreActivitiesQuery } from "@/api/activitiesQueries";
import { ErrorView } from "@/shared/components/ErrorView";
import { usePageData } from "@/shared/hooks/usePageData";

export default function ExplorePage() {
  const { dataVersion } = useActivities();
  const { data: activities, error } = usePageData(getExploreActivitiesQuery, [dataVersion]);

  if (error) return <ErrorView error={error} />;
  if (!activities) return <ActivitiesListSkeleton />;

  return (
    <>
      <ActivitiesFeed
        activities={activities}
        scope="others"
        emptyTitle="No hay actividades comunitarias"
        emptyMessage="Actualmente no hay convocatorias de otros miembros disponibles para explorar."
      />
      {/* Acceso directo para crear sin pasar por Mis actividades */}
      <CreateActivitySheet irAMisActividadesAlCrear />
    </>
  );
}
