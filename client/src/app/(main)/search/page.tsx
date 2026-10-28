import type { Metadata } from "next";
import { ActivitySearchView } from "@/features/activities/presentation/components/views/activity-search-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar actividades - Súmate",
  description: "Encuentra iniciativas solidarias, eventos de voluntariado y actividades comunitarias en Súmate.",
};

export default function SearchPage() {
  return <ActivitySearchView />;
}
