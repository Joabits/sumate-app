import { useLocation } from "react-router";
import { AppHeader } from "./AppHeader";
import { AppNavbar } from "./AppNavbar";

export function MainLayoutHeader() {
  const { pathname } = useLocation();

  if (pathname === "/search") {
    return null;
  }

  return (
    <header className="shrink-0 z-40 bg-white">
      <AppHeader />
      {/* En pantallas de escritorio la navegación está en el DesktopSidebar */}
      <div className="lg:hidden">
        <AppNavbar />
      </div>
    </header>
  );
}
