import { Outlet } from "react-router";
import { ActivitiesProvider } from "@/activities/context/ActivitiesProvider";
import { HorasProvider } from "@/horas/context/HorasProvider";
import { ParticipationsProvider } from "@/participations/context/ParticipationsProvider";

/**
 * Providers de la parte de la app con sesión (explorar, mis actividades,
 * trayectoria, búsqueda y detalle). Ver routers/AppRoutes.tsx.
 * AuthProvider ya envuelve todo desde main.tsx.
 */
export function AppProviders() {
  return (
    <ActivitiesProvider>
      <ParticipationsProvider>
        <HorasProvider>
          <Outlet />
        </HorasProvider>
      </ParticipationsProvider>
    </ActivitiesProvider>
  );
}
