import { ActivitySearchView } from "@/activities/components/ActivitySearchView";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export default function SearchPage() {
  useDocumentTitle("Buscar actividades - Súmate");
  return <ActivitySearchView />;
}
