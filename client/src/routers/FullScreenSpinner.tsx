import { Loader2 } from "lucide-react";

/** Se muestra un instante mientras se consulta la sesión. */
export function FullScreenSpinner() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-fondo" aria-busy="true">
      <Loader2 className="w-7 h-7 animate-spin text-accion" aria-label="Cargando" />
    </div>
  );
}
