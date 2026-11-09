import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cancelarActividadAction,
  closeActivityAction,
  createActivityAction,
  deleteActivityAction,
  publishActivityAction,
  reopenActivityAction,
  replaceActivityCausesAction,
  updateActivityCapacityAction,
  updateActivityDescriptionAction,
  updateActivityImageAction,
  updateActivityInfoAction,
  updateActivityLocationAction,
} from "@/api/activitiesActions";
import type { ApiActionResult } from "@/api/apiResults";
import { listCausesQuery } from "@/api/activitiesQueries";
import { ActivitiesContext } from "./ActivitiesContext";
import type { ActivitiesContextValue, Cause } from "./activitiesTypes";

/**
 * Reparte a los componentes el catálogo de causas y las acciones sobre
 * actividades (crear, editar, publicar, cancelar...).
 *
 * Cada acción que sale bien sube `dataVersion`; las páginas abiertas lo
 * vigilan y vuelven a pedir sus datos al backend.
 */
export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [isLoadingCauses, setIsLoadingCauses] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const refresh = useCallback(() => setDataVersion((v) => v + 1), []);

  // El catálogo de causas se carga una sola vez al entrar a la app
  useEffect(() => {
    let active = true;
    listCausesQuery()
      .then((list) => active && setCauses(list))
      .catch(() => undefined)
      .finally(() => active && setIsLoadingCauses(false));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ActivitiesContextValue>(() => {
    const thenRefresh =
      <A extends unknown[]>(action: (...args: A) => Promise<ApiActionResult>) =>
      async (...args: A) => {
        const result = await action(...args);
        if (result.ok) refresh();
        return result;
      };

    return {
      causes,
      isLoadingCauses,
      dataVersion,
      refresh,
      createActivity: thenRefresh(createActivityAction),
      updateInfo: thenRefresh(updateActivityInfoAction),
      updateCapacity: thenRefresh(updateActivityCapacityAction),
      updateDescription: thenRefresh(updateActivityDescriptionAction),
      updateImage: thenRefresh(updateActivityImageAction),
      updateLocation: thenRefresh(updateActivityLocationAction),
      replaceCauses: thenRefresh(replaceActivityCausesAction),
      publish: thenRefresh(publishActivityAction),
      close: thenRefresh(closeActivityAction),
      reopen: thenRefresh(reopenActivityAction),
      cancelar: thenRefresh(cancelarActividadAction),
      deleteActivity: thenRefresh(deleteActivityAction),
    };
  }, [causes, isLoadingCauses, dataVersion, refresh]);

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}
