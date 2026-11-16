import { useMemo, useState, type ReactNode } from "react";
import { ActivityDetailContext } from "./ActivityDetailContext";
import type {
  ActivityDetailContextValue as Ctx,
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

  const value = useMemo<Ctx>(() => {
    const setEditMode: Ctx["setEditMode"] = (enabled) => {
      setIsEditModeState(enabled);
      setActiveField(null);
      setIsLocationSheetOpen(false);
    };

    const toggleEditMode = () => setEditMode(!isEditMode);

    const openLocationSheet = () => {
      setIsLocationSheetOpen(true);
      setActiveField("location");
    };

    const closeLocationSheet = () => {
      setIsLocationSheetOpen(false);
      setActiveField(null);
    };

    return {
      activity,
      isEditMode,
      activeField,
      isLocationSheetOpen,
      setEditMode,
      toggleEditMode,
      setActiveField,
      openLocationSheet,
      closeLocationSheet,
    };
  }, [activity, isEditMode, activeField, isLocationSheetOpen]);

  return (
    <ActivityDetailContext.Provider value={value}>{children}</ActivityDetailContext.Provider>
  );
}
