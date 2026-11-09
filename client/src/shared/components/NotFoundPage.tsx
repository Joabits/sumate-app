import { SearchX } from "lucide-react";
import Link from "@/shared/components/Link";

/** Ruta que no existe, o actividad que no se encontró. */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-5">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          No encontramos esta página
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Puede que el enlace esté mal escrito o que la actividad ya no exista.
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#6355de] hover:bg-[#5446cc] text-white px-5 py-2.5 text-sm font-semibold"
        >
          Ir a Explorar
        </Link>
      </div>
    </div>
  );
}
