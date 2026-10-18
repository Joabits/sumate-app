"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAVIGATION_ITEMS } from "../../config/navigation.config";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navegación lateral de escritorio"
      className="hidden lg:flex flex-col justify-between w-64 xl:w-72 h-full shrink-0 bg-[#fafbfd] select-none"
    >
      <div className="flex flex-col pt-6 px-4">
        {/* Lista de navegación vertical */}
        <nav className="flex flex-col space-y-2">
          {NAVIGATION_ITEMS.filter((item) => item.enabled).map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex items-center gap-3.5 px-4 py-3 text-sm font-semibold transition-all rounded-2xl ${
                  isActive
                    ? "bg-slate-200/80 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                {/* Ícono a la izquierda */}
                <div className="relative w-6 h-6 shrink-0 transition-transform group-hover:scale-105">
                  <Image
                    src={item.iconUrl}
                    alt=""
                    fill
                    sizes="24px"
                    className="object-contain"
                  />
                </div>

                {/* Texto al lado derecho */}
                <span className="truncate">{item.label}</span>

                {/* Indicador de página activa desplazado un poco hacia la izquierda */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-2.5 bottom-2.5 w-1 bg-black rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Pie de navegación lateral */}
      <div className="px-6 py-5">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} Súmate
        </p>
      </div>
    </aside>
  );
}
