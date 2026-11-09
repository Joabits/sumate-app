import { ActivitiesListSkeleton } from "@/activities/components/ActivitiesListSkeleton";
import { useActivities } from "@/activities/hooks/useActivities";
import { getMyParticipationsQuery } from "@/api/participationsQueries";
import { RecentlyFeed } from "@/participations/components/RecentlyFeed";
import { ErrorView } from "@/shared/components/ErrorView";
import { usePageData } from "@/shared/hooks/usePageData";

export default function RecentlyPage() {
  const { dataVersion } = useActivities();
  const { data: participations, error } = usePageData(getMyParticipationsQuery, [dataVersion]);

  if (error) return <ErrorView error={error} />;
  if (!participations) return <ActivitiesListSkeleton />;

  return <RecentlyFeed participations={participations} />;
}
