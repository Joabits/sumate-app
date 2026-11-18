import Link from "@/shared/components/Link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorViewProps = {
  error: Error;
  /** Vuelve a intentar la carga (por defecto recarga la página) */
  onRetry?: () => void;
};

/** Pantalla de error cuando una página no pudo cargar sus datos. */
export function ErrorView({ error, onRetry = () => window.location.reload() }: ErrorViewProps) {

  return (
    <div className="min-h-screen bg-superficie flex items-center justify-center p-5 selection:bg-accion-suave">
      <div className="w-full max-w-md bg-fondo rounded-3xl p-6 sm:p-8 shadow-xl shadow-borde/60 border border-borde-suave text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-error-suave text-error flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-texto tracking-tight">
          Algo no salió como esperábamos
        </h1>

        <p className="mt-2 text-sm text-texto-tenue leading-relaxed">
          {error.message
            ? error.message
            : "Ocurrió un error inesperado al procesar la solicitud. Por favor intenta nuevamente."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onRetry}
            className="flex-1 bg-accion hover:bg-accion-hover text-sobre-accion rounded-xl py-2.5 flex items-center justify-center gap-2 cursor-pointer font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="flex-1 border-borde text-texto-secundario hover:bg-superficie rounded-xl py-2.5 font-semibold"
          >
            <Link href="/explore" className="flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              <span>Ir a Explorar</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
