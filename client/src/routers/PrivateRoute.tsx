import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/auth/hooks/useAuth";
import { FullScreenSpinner } from "./FullScreenSpinner";

/** Rutas que necesitan sesión. Sin sesión → al login. */
export function PrivateRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}
