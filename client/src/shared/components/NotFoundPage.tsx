import { SearchX } from "lucide-react";
import Link from "@/shared/components/Link";

/** Ruta que no existe, o actividad que no se encontró. */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-fondo flex items-center justify-center p-5">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-superficie-alta text-texto-tenue flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-texto tracking-tight">
          No encontramos esta página
        </h1>
        <p className="mt-2 text-sm text-texto-tenue">
          Puede que el enlace esté mal escrito o que la actividad ya no exista.
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-accion hover:bg-accion-hover text-sobre-accion px-5 py-2.5 text-sm font-semibold"
        >
          Ir a Explorar
        </Link>
      </div>
    </div>
  );
}
