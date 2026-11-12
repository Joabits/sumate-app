import { useCallback, useMemo, useState } from "react";
import type {
  ActivityListItem,
  SearchFilterState,
} from "@/activities/context/activitiesTypes";
import { useActivities } from "@/activities/hooks/useActivities";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";

export const DEFAULT_SEARCH_FILTERS: SearchFilterState = {
  timeOfDay: "any",
  datePreset: "upcoming",
  capacityRange: "any",
  causeIds: [],
  distanceKm: 50,
};

function getDiscreetUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 60000,
      }
    );
  });
}

export function useActivitySearch() {
  const { searchActivities } = useActivities();
  const { track } = useAnalitica();
  const [query, setQuery] = useState<string>("");
  const [filters, setFilters] = useState<SearchFilterState>(DEFAULT_SEARCH_FILTERS);
  const [draftFilters, setDraftFilters] = useState<SearchFilterState>(DEFAULT_SEARCH_FILTERS);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ActivityListItem[]>([]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.timeOfDay !== "any") count++;
    if (filters.datePreset !== "upcoming") count++;
    if (filters.capacityRange !== "any") count++;
    if (filters.causeIds.length > 0) count += filters.causeIds.length;
    if (filters.distanceKm < 50) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFiltersCount > 0;

  const executeSearch = useCallback(
    async (queryToSearch: string, filtersToSearch: SearchFilterState) => {
      const trimmedQuery = queryToSearch.trim();
      const areFiltersDefault =
        filtersToSearch.timeOfDay === "any" &&
        filtersToSearch.datePreset === "upcoming" &&
        filtersToSearch.capacityRange === "any" &&
        filtersToSearch.causeIds.length === 0 &&
        filtersToSearch.distanceKm >= 50;

      // Si no hay texto y los filtros están en valores por defecto, resetear a vista inicial
      if (!trimmedQuery && areFiltersDefault) {
        setHasSearched(false);
        setItems([]);
        setIsLoading(false);
        return;
      }

      setHasSearched(true);
      setIsLoading(true);

      try {
        // Pedir la ubicación actual de forma discreta
        const location = await getDiscreetUserLocation();

        const encontradas = await searchActivities({
          q: trimmedQuery || undefined,
          timeOfDay: filtersToSearch.timeOfDay,
          datePreset: filtersToSearch.datePreset,
          capacityRange: filtersToSearch.capacityRange,
          causeIds: filtersToSearch.causeIds,
          userLat: location?.latitude,
          userLon: location?.longitude,
          maxDistanceKm:
            filtersToSearch.distanceKm < 50 ? filtersToSearch.distanceKm : undefined,
        });

        setItems(encontradas);
        // Sin el texto buscado ni los filtros elegidos: solo si hubo texto, filtros y resultados
        track("busqueda_realizada", {
          con_texto: Boolean(trimmedQuery),
          con_filtros: !areFiltersDefault,
          con_resultados: encontradas.length > 0,
        });
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchActivities, track]
  );

  const submitSearch = () => {
    executeSearch(query, filters);
  };

  const openFiltersSheet = () => {
    setDraftFilters(filters);
    setIsFiltersSheetOpen(true);
  };

  const closeFiltersSheet = () => {
    setIsFiltersSheetOpen(false);
  };

  const applyDraftFilters = () => {
    setFilters(draftFilters);
    setIsFiltersSheetOpen(false);
    executeSearch(query, draftFilters);
  };

  const resetDraftFilters = () => {
    setDraftFilters(DEFAULT_SEARCH_FILTERS);
  };

  const clearQuery = () => {
    setQuery("");
    const areFiltersDefault =
      filters.timeOfDay === "any" &&
      filters.datePreset === "upcoming" &&
      filters.capacityRange === "any" &&
      filters.causeIds.length === 0 &&
      filters.distanceKm >= 50;

    if (areFiltersDefault) {
      setHasSearched(false);
      setItems([]);
    } else {
      executeSearch("", filters);
    }
  };

  return {
    query,
    setQuery,
    clearQuery,
    submitSearch,
    filters,
    draftFilters,
    setDraftFilters,
    isFiltersSheetOpen,
    setIsFiltersSheetOpen,
    openFiltersSheet,
    closeFiltersSheet,
    applyDraftFilters,
    resetDraftFilters,
    hasSearched,
    isLoading,
    items,
    activeFiltersCount,
    hasActiveFilters,
  };
}
