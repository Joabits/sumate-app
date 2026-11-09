import { Outlet } from "react-router";
import { DesktopSidebar } from "@/shared/components/DesktopSidebar";
import { MainLayoutHeader } from "@/shared/components/MainLayoutHeader";

/** Marco de Explorar, Mis actividades, Mis solicitudes y Buscar: menú lateral, cabecera y contenido. */
export function MainLayout() {
  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-white text-slate-800 flex justify-center selection:bg-[#ece9fc] selection:text-[#4334b8] overflow-hidden">
      {/* En móvil/tablet se centra en max-w-md; en desktop (>= lg) ocupa toda la pantalla con sidebar y contenido */}
      <div className="w-full max-w-md lg:max-w-none h-full flex flex-col lg:flex-row relative overflow-hidden bg-white">
        {/* Sidebar exclusivo para escritorio (>= 1024px) */}
        <DesktopSidebar />

        {/* Contenido principal y cabecera en escritorio */}
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-white">
          <MainLayoutHeader />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
