"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, LogOut, X, CircleUser } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { appToast } from "../notifications/toast";
import { useRouter } from "next/navigation";
import { clearJWT } from "@/features/shared/infrastructure/http/jwt-manager";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

export function AppHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    clearJWT();
    const { error } = await authClient.signOut();
    if (error) {
      appToast.error(
        "Error al cerrar sesión",
        "Tuvimos un error al cerrar tu sesión."
      );
      return;
    }
    appToast.info("Cerrando sesión. ¡Hasta luego!");
    setOpen(false);
    router.replace("/");
  };

  const user = session?.user;
  const userInitials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : "U";

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 sm:px-5 lg:px-8 pt-4 pb-2 border-b border-slate-100 lg:border-none"
      data-purpose="app-header"
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 lg:gap-6 w-full" data-purpose="search-and-profile">
        {/* Buscador interactivo: 20% más largo hacia la derecha (lg:max-w-3xl xl:max-w-4xl) */}
        <div className="flex-1 min-w-0 lg:max-w-3xl xl:max-w-4xl">
          <button
            type="button"
            onClick={() => router.push("/search")}
            aria-label="Buscar actividades"
            className="w-full flex items-center justify-start gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 lg:py-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-sm lg:text-[15px] text-slate-400 shadow-xs hover:border-slate-300 hover:bg-slate-100/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            <Search className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 shrink-0" />
            <span className="truncate font-normal">Buscar actividades por nombre, causa o lugar...</span>
          </button>
        </div>

        {/* Popover con Avatar y Menú de Perfil */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Perfil de usuario"
              className="relative shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden border-2 border-slate-200 hover:border-black transition-all focus:outline-none focus:ring-2 focus:ring-black/20 active:scale-95 shadow-xs flex items-center justify-center bg-slate-100 cursor-pointer"
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
                <span className="font-bold text-xs lg:text-sm text-zinc-700">
                  {userInitials}
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4"
          >
            {/* Cabecera del Popover con Súmate y botón cerrar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5 rounded-md overflow-hidden shrink-0">
                  <Image
                    src="/assets/sumate-app-icon.png"
                    alt="Súmate"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="font-bold text-sm text-[#6355de] tracking-tight">
                  Súmate
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Centro: Foto de perfil, nombre y correo */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 shadow-xs mb-2.5 bg-slate-100 flex items-center justify-center">
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "Avatar"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <CircleUser className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 leading-snug">
                {user?.name || "Usuario Súmate"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">
                {user?.email || "Sin correo"}
              </p>
            </div>

            {/* Pie: Botón Cerrar sesión */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all focus:outline-none cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
