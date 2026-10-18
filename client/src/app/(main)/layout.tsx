import { MainLayoutHeader } from "@/features/shared/presentation/components/layout/main-layout-header";
import { DesktopSidebar } from "@/features/shared/presentation/components/layout/desktop-sidebar";
import { listCausesQuery } from "@/features/activities/presentation/queries/activity.query";
import { CausesInitializer } from "@/features/activities/presentation/components/elements/causes-initializer";
import type { Cause } from "@/features/activities/domain/entities/activity.entity";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let causes: Cause[] = [];
  try {
    causes = await listCausesQuery();
  } catch {
    causes = [];
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-white text-slate-800 flex justify-center selection:bg-[#ece9fc] selection:text-[#4334b8] overflow-hidden">
      <CausesInitializer initialCauses={causes} />

      {/* Contenedor Responsivo: En móvil/tablet se centra en max-w-md; en desktop (>= lg) ocupa toda la pantalla con sidebar y contenido */}
      <div className="w-full max-w-md lg:max-w-none h-full flex flex-col lg:flex-row relative overflow-hidden bg-white">
        {/* Sidebar exclusivo para escritorio (>= 1024px) */}
        <DesktopSidebar />

        {/* Contenido principal y cabecera en escritorio */}
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-white">
          <MainLayoutHeader />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
