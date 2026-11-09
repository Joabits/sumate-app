import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router";
import { getConstanciaQuery } from "@/api/horasQueries";
import { formatoHoras, formatoJornada } from "@/horas/utils/formato";
import { ErrorView } from "@/shared/components/ErrorView";
import Image from "@/shared/components/Image";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { usePageData } from "@/shared/hooks/usePageData";

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", {
    timeZone: "America/La_Paz",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Constancia del voluntario. Solo incluye horas que él mismo confirmó. */
export default function ConstanciaPage() {
  const navigate = useNavigate();
  const { data: constancia, error } = usePageData(getConstanciaQuery, []);
  useDocumentTitle("Constancia de voluntariado - Súmate");

  if (error) return <ErrorView error={error} />;
  if (!constancia) {
    return <p className="p-8 text-center text-sm text-slate-500">Preparando tu constancia...</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={constancia.totalHoras === 0}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#6355DE] hover:bg-[#5244cc] text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Imprimir constancia
          </button>
        </div>

        <article className="bg-white rounded-3xl border border-slate-200 shadow-sm print:shadow-none print:border-0 print:rounded-none p-6 sm:p-10">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0">
                <Image src="/assets/sumate-app-icon.png" alt="" fill className="object-cover" />
              </div>
              <span className="text-xl font-extrabold text-[#6355DE] tracking-tight">Súmate</span>
            </div>
            <p className="text-xs text-slate-500 text-right">
              Emitida el {fechaLarga(constancia.emitida)}
            </p>
          </header>

          <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Constancia de voluntariado
          </h1>

          {constancia.totalHoras === 0 ? (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Todavía no tienes horas confirmadas. Cuando una organización registre tus horas y
              las aceptes en el detalle de la actividad, aparecerán aquí.
            </p>
          ) : (
            <>
              <p className="mt-4 text-[15px] text-slate-700 leading-relaxed">
                Se deja constancia de que <strong className="text-slate-900">{constancia.voluntario}</strong>{" "}
                ({constancia.correo}) realizó{" "}
                <strong className="text-slate-900">{formatoHoras(constancia.totalHoras)}</strong> de
                voluntariado en las siguientes actividades:
              </p>

              <div className="mt-6 space-y-5">
                {constancia.actividades.map((actividad) => (
                  <section
                    key={actividad.activityId}
                    aria-label={actividad.nombre}
                    className="rounded-2xl border border-slate-200 p-4 break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-bold text-slate-900">{actividad.nombre}</h2>
                      <span className="text-sm font-bold text-slate-900">
                        {formatoHoras(actividad.totalHoras)}
                      </span>
                    </div>
                    {actividad.organizador && (
                      <p className="text-xs text-slate-500 mt-0.5">Organizada por {actividad.organizador}</p>
                    )}
                    <table className="mt-3 w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-1.5 font-semibold">Jornada</th>
                          <th className="py-1.5 font-semibold text-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actividad.jornadas.map((j) => (
                          <tr key={j.jornada} className="border-t border-slate-100">
                            <td className="py-1.5 text-slate-700">{formatoJornada(j.jornada)}</td>
                            <td className="py-1.5 text-right font-semibold text-slate-900">
                              {formatoHoras(j.horas)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 print:bg-white print:border print:border-slate-300 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">Total de horas confirmadas</span>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatoHoras(constancia.totalHoras)}
                </span>
              </div>
            </>
          )}

          <p className="mt-8 text-xs text-slate-500 leading-relaxed">
            Solo se incluyen las horas que el voluntario confirmó. Las horas pendientes o en
            reclamo no forman parte de esta constancia.
          </p>
        </article>
      </div>
    </div>
  );
}
