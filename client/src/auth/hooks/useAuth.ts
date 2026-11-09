import { useContext } from "react";
import { AuthContext } from "@/auth/context/AuthContext";

/** Sesión actual y acciones de login/logout. Úsalo dentro de AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }
  return context;
}
