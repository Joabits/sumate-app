"use client";

import { useEffect } from "react";
import type { Cause } from "@/features/activities/domain/entities/activity.entity";
import { useCausesStore } from "../../stores/causes.store";

type CausesInitializerProps = {
  initialCauses: Cause[];
};

export function CausesInitializer({ initialCauses }: CausesInitializerProps) {
  // Se cargan una sola vez antes del primer render de las pantallas que las usan
  if (!useCausesStore.getState().isLoaded && initialCauses && initialCauses.length > 0) {
    useCausesStore.getState().setCauses(initialCauses);
  }

  useEffect(() => {
    if (initialCauses && initialCauses.length > 0) {
      useCausesStore.getState().setCauses(initialCauses);
    }
  }, [initialCauses]);

  return null;
}
