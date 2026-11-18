import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { useCuenta } from "@/cuenta/hooks/useCuenta";
import { EliminarCuentaDialog } from "@/cuenta/components/EliminarCuentaDialog";
import { ErrorView } from "@/shared/components/ErrorView";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { usePageData } from "@/shared/hooks/usePageData";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", {
    timeZone: "America/La_Paz",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Seccion({ titulo, vacio, children }: { titulo: string; vacio: boolean; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="rounded-2xl border border-borde bg-fondo p-4 sm:p-5">
      <h2 className="text-base font-bold text-texto">{titulo}</h2>
      {vacio ? <p className="mt-2 text-sm text-texto-tenue">No hay nada guardado.</p> : children}
    </section>
  );
}

/** Mis datos (Tarea 10): ver lo que la app guarda, descargarlo y eliminar la cuenta. */
export default function MisDatosPage() {
  const { getMisDatos, descargarMisDatos, iniciarEliminacion } = useCuenta();
  const { data: datos, error } = usePageData(getMisDatos, []);
  const [eliminando, setEliminando] = useState(false);
  useDocumentTitle("Mis datos - Súmate");

  if (error) return <ErrorView error={error} />;
  if (!datos) return <p className="p-8 text-center text-sm text-texto-tenue">Cargando tus datos...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold text-texto tracking-tight">Mis datos</h1>
        <p className="text-sm text-texto-secundario">
          Esto es todo lo que Súmate guarda de ti. Puedes descargarlo en un archivo JSON.
        </p>
        <button
          type="button"
          onClick={() => descargarMisDatos(datos)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accion hover:bg-accion-hover text-sobre-accion text-sm font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar mis datos (JSON)
        </button>
      </header>

      <Seccion titulo="Perfil" vacio={false}>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-texto-tenue">Nombre</dt>
          <dd className="text-texto">{datos.perfil.nombre}</dd>
          <dt className="text-texto-tenue">Correo</dt>
          <dd className="text-texto break-all">{datos.perfil.correo}</dd>
        </dl>
      </Seccion>

      <Seccion
        titulo={`Actividades que organizas (${datos.actividadesOrganizadas.length})`}
        vacio={datos.actividadesOrganizadas.length === 0}
      >
        <ul className="mt-2 divide-y divide-borde-suave text-sm">
          {datos.actividadesOrganizadas.map((a) => (
            <li key={a.id} className="py-1.5 flex justify-between gap-3">
              <span className="text-texto">{a.nombre}</span>
              <span className="text-texto-tenue shrink-0">{fecha(a.fecha)}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={`Mis solicitudes (${datos.solicitudes.length})`} vacio={datos.solicitudes.length === 0}>
        <ul className="mt-2 divide-y divide-borde-suave text-sm">
          {datos.solicitudes.map((s) => (
            <li key={`${s.actividad}-${s.solicitadaEl}`} className="py-1.5 flex justify-between gap-3">
              <span className="text-texto">{s.actividad}</span>
              <span className="text-texto-tenue shrink-0">{s.estado.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={`Mis horas (${datos.horas.length})`} vacio={datos.horas.length === 0}>
        <ul className="mt-2 divide-y divide-borde-suave text-sm">
          {datos.horas.map((h) => (
            <li key={`${h.actividad}-${h.jornada}`} className="py-1.5 flex justify-between gap-3">
              <span className="text-texto">
                {h.actividad} · {h.horas} h
              </span>
              <span className="text-texto-tenue shrink-0">{h.estado}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <section aria-label="Eliminar mi cuenta" className="rounded-2xl border border-borde bg-fondo p-4 sm:p-5">
        <h2 className="text-base font-bold text-texto">Eliminar mi cuenta</h2>
        <p className="mt-1 text-sm text-texto-secundario">
          Antes de confirmar te mostramos qué se borra y qué se conserva.
        </p>
        <button
          type="button"
          onClick={() => {
            iniciarEliminacion(datos);
            setEliminando(true);
          }}
          className="mt-3 h-11 px-5 rounded-xl border border-error-borde bg-fondo text-error-fuerte hover:bg-error-suave text-sm font-semibold cursor-pointer"
        >
          Eliminar mi cuenta
        </button>
      </section>

      <EliminarCuentaDialog datos={datos} isOpen={eliminando} onOpenChange={setEliminando} />
    </div>
  );
}
