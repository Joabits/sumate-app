/**
 * Punto de entrada de la app de React.
 *
 *   AuthProvider  → la sesión, para toda la app
 *   BrowserRouter → las rutas (routers/AppRoutes.tsx)
 */
import "@/cobertura";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Toaster } from "sileo";
import { AuthProvider } from "@/auth/context/AuthProvider";
import { AppRoutes } from "@/routers/AppRoutes";
import { PwaRegister } from "@/shared/components/PwaRegister";
import { leerToken } from "@/shared/lib/tokens";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
    <PwaRegister />
    <Toaster position="top-center" options={{ fill: leerToken("--color-fondo", "white"), roundness: 18 }} />
  </StrictMode>,
);
