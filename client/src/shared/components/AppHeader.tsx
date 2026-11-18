import { useState } from "react";
import Image from "@/shared/components/Image";
import { Search, LogOut, X, CircleUser, FileText, UserCog } from "lucide-react";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "./Toast";
import { useNavigate } from "react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

export function AppHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, isLoading: isPending, logout } = useAuth();

  const handleSignOut = async () => {
    const result = await logout();
    if (!result.ok) {
      appToast.error("Error al cerrar sesión", result.message);
      return;
    }
    appToast.info("Cerrando sesión. ¡Hasta luego!");
    setOpen(false);
    navigate("/", { replace: true });
  };
  const userInitials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : "U";

  return (
    <header
      className="sticky top-0 z-40 bg-fondo/95 backdrop-blur-md px-4 sm:px-5 lg:px-8 pt-4 pb-2 border-b border-borde-suave lg:border-none"
      data-purpose="app-header"
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 lg:gap-6 w-full" data-purpose="search-and-profile">
        {/* Buscador interactivo: 20% más largo hacia la derecha (lg:max-w-3xl xl:max-w-4xl) */}
        <div className="flex-1 min-w-0 lg:max-w-3xl xl:max-w-4xl">
          <button
            type="button"
            onClick={() => navigate("/search")}
            aria-label="Buscar actividades"
            className="w-full flex items-center justify-start gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 lg:py-3 bg-superficie/80 border border-borde/80 rounded-2xl text-sm lg:text-[15px] text-texto-tenue shadow-xs hover:border-borde-fuerte hover:bg-superficie-alta/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-velo/10"
          >
            <Search className="w-4 h-4 lg:w-5 lg:h-5 text-texto-tenue shrink-0" />
            <span className="truncate font-normal">Buscar actividades por nombre, causa o lugar...</span>
          </button>
        </div>

        {/* Popover con Avatar y Menú de Perfil */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Perfil de usuario"
              className="relative shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden border-2 border-borde hover:border-velo transition-all focus:outline-none focus:ring-2 focus:ring-velo/20 active:scale-95 shadow-xs flex items-center justify-center bg-superficie-alta cursor-pointer"
            >
              {isPending ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Foto de perfil"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="font-bold text-xs lg:text-sm text-texto-secundario">
                  {userInitials}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-72 bg-fondo rounded-2xl shadow-xl border border-borde-suave p-4"
          >
            {/* Cabecera del Popover con Súmate y botón cerrar */}
            <div className="flex items-center justify-between border-b border-borde-suave pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5 rounded-md overflow-hidden shrink-0">
                  <Image
                    src="/assets/sumate-app-icon.png"
                    alt="Súmate"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="font-bold text-sm text-accion tracking-tight">
                  Súmate
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-texto-tenue hover:text-texto-secundario focus:outline-none p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Centro: Foto de perfil, nombre y correo */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-borde shadow-xs mb-2.5 bg-superficie-alta flex items-center justify-center">
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "Avatar"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <CircleUser className="w-10 h-10 text-texto-tenue" />
                )}
              </div>
              <h3 className="font-bold text-sm text-texto leading-snug">
                {user?.name || "Usuario Súmate"}
              </h3>
              <p className="text-xs text-texto-tenue mt-0.5 truncate max-w-[220px]">
                {user?.email || "Sin correo"}
              </p>
            </div>

            {/* Pie: constancia de horas, mis datos y cerrar sesión */}
            <div className="mt-3 pt-3 border-t border-borde-suave space-y-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/constancia");
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-accion bg-accion-suave hover:bg-accion-suave active:scale-95 transition-all focus:outline-none cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Mi constancia de horas</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/mis-datos");
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-texto-secundario bg-superficie-alta hover:bg-superficie-hover active:scale-95 transition-all focus:outline-none cursor-pointer"
              >
                <UserCog className="w-4 h-4" />
                <span>Mis datos y cuenta</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-error bg-error-suave hover:bg-error-suave active:scale-95 transition-all focus:outline-none cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-error" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
