import { useParams } from "react-router";
import { ActivityDetailSkeleton } from "@/activities/components/ActivityDetailSkeleton";
import { ActivityDetailView } from "@/activities/components/ActivityDetailView";
import { ActivityDetailProvider } from "@/activities/context/ActivityDetailProvider";
import { useActivities } from "@/activities/hooks/useActivities";
import { ErrorView } from "@/shared/components/ErrorView";
import NotFoundPage from "@/shared/components/NotFoundPage";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { usePageData } from "@/shared/hooks/usePageData";

export default function ActivityDetailPage() {
  const { id = "" } = useParams();
  const { dataVersion, getActivityDetail } = useActivities();
  const { data: activity, error, isLoading } = usePageData(
    () => getActivityDetail(id),
    [id, dataVersion],
  );

  useDocumentTitle(
    activity ? `${activity.name} - Súmate` : activity === null ? "Actividad no encontrada - Súmate" : undefined,
  );

  if (error) return <ErrorView error={error} />;
  if (isLoading) return <ActivityDetailSkeleton />;
  if (!activity) return <NotFoundPage />;

  return (
    <ActivityDetailProvider activity={activity}>
      <ActivityDetailView />
    </ActivityDetailProvider>
  );
}
