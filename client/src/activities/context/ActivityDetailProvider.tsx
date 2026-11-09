import { useMemo, useState, type ReactNode } from "react";
import { ActivityDetailContext } from "./ActivityDetailContext";
import type {
  ActivityDetailContextValue,
  ActivityDetailData,
  EditableField,
} from "./activitiesTypes";

type ActivityDetailProviderProps = {
  /** La actividad que cargó el servidor (pages/ActivityDetailPage.tsx) */
  activity: ActivityDetailData;
  children: ReactNode;
};

/**
 * Envuelve la pantalla de detalle. Todos los componentes de adentro leen la
 * actividad y el modo edición con useActivityDetail(), sin pasarla por props.
 * Al salir de la pantalla el estado se pierde solo: el modo edición se reinicia.
 */
export function ActivityDetailProvider({ activity, children }: ActivityDetailProviderProps) {
  const [isEditMode, setIsEditModeState] = useState(false);
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);

  const value = useMemo<ActivityDetailContextValue>(() => {
    const setEditMode = (enabled: boolean) => {
      setIsEditModeState(enabled);
      setActiveField(null);
      setIsLocationSheetOpen(false);
    };
    return {
      activity,
      isEditMode,
      activeField,
      isLocationSheetOpen,
      setEditMode,
      toggleEditMode: () => setEditMode(!isEditMode),
      setActiveField,
      openLocationSheet: () => {
        setIsLocationSheetOpen(true);
        setActiveField("location");
      },
      closeLocationSheet: () => {
        setIsLocationSheetOpen(false);
        setActiveField(null);
      },
    };
  }, [activity, isEditMode, activeField, isLocationSheetOpen]);

  return (
    <ActivityDetailContext.Provider value={value}>{children}</ActivityDetailContext.Provider>
  );
}
