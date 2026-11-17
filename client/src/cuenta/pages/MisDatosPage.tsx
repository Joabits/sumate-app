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
    <section aria-label={titulo} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
      {vacio ? <p className="mt-2 text-sm text-slate-500">No hay nada guardado.</p> : children}
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
  if (!datos) return <p className="p-8 text-center text-sm text-slate-500">Cargando tus datos...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mis datos</h1>
        <p className="text-sm text-slate-600">
          Esto es todo lo que Súmate guarda de ti. Puedes descargarlo en un archivo JSON.
        </p>
        <button
          type="button"
          onClick={() => descargarMisDatos(datos)}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#6355DE] hover:bg-[#5244cc] text-white text-sm font-semibold cursor-pointer"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar mis datos (JSON)
        </button>
      </header>

      <Seccion titulo="Perfil" vacio={false}>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Nombre</dt>
          <dd className="text-slate-900">{datos.perfil.nombre}</dd>
          <dt className="text-slate-500">Correo</dt>
          <dd className="text-slate-900 break-all">{datos.perfil.correo}</dd>
        </dl>
      </Seccion>

      <Seccion
        titulo={`Actividades que organizas (${datos.actividadesOrganizadas.length})`}
        vacio={datos.actividadesOrganizadas.length === 0}
      >
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {datos.actividadesOrganizadas.map((a) => (
            <li key={a.id} className="py-1.5 flex justify-between gap-3">
              <span className="text-slate-900">{a.nombre}</span>
              <span className="text-slate-500 shrink-0">{fecha(a.fecha)}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={`Mis solicitudes (${datos.solicitudes.length})`} vacio={datos.solicitudes.length === 0}>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {datos.solicitudes.map((s) => (
            <li key={`${s.actividad}-${s.solicitadaEl}`} className="py-1.5 flex justify-between gap-3">
              <span className="text-slate-900">{s.actividad}</span>
              <span className="text-slate-500 shrink-0">{s.estado.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={`Mis horas (${datos.horas.length})`} vacio={datos.horas.length === 0}>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {datos.horas.map((h) => (
            <li key={`${h.actividad}-${h.jornada}`} className="py-1.5 flex justify-between gap-3">
              <span className="text-slate-900">
                {h.actividad} · {h.horas} h
              </span>
              <span className="text-slate-500 shrink-0">{h.estado}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <section aria-label="Eliminar mi cuenta" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Eliminar mi cuenta</h2>
        <p className="mt-1 text-sm text-slate-600">
          Antes de confirmar te mostramos qué se borra y qué se conserva.
        </p>
        <button
          type="button"
          onClick={() => {
            iniciarEliminacion(datos);
            setEliminando(true);
          }}
          className="mt-3 h-11 px-5 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-sm font-semibold cursor-pointer"
        >
          Eliminar mi cuenta
        </button>
      </section>

      <EliminarCuentaDialog datos={datos} isOpen={eliminando} onOpenChange={setEliminando} />
    </div>
  );
}
