import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/auth/hooks/useAuth";
import { FullScreenSpinner } from "./FullScreenSpinner";

/** Rutas solo para quien no inició sesión (bienvenida, login, registro). Con sesión → a Explorar. */
export function PublicRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/explore" replace />;
  return <Outlet />;
}
