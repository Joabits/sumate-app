import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router";
import { useHoras } from "@/horas/hooks/useHoras";
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
  const { getConstancia } = useHoras();
  const { data: constancia, error } = usePageData(getConstancia, []);
  useDocumentTitle("Constancia de voluntariado - Súmate");

  if (error) return <ErrorView error={error} />;
  if (!constancia) {
    return <p className="p-8 text-center text-sm text-texto-tenue">Preparando tu constancia...</p>;
  }

  return (
    <div className="min-h-screen bg-superficie print:bg-fondo py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-texto-secundario hover:text-texto cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={constancia.totalHoras === 0}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accion hover:bg-accion-hover text-sobre-accion text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Imprimir constancia
          </button>
        </div>

        <article className="bg-fondo rounded-3xl border border-borde shadow-sm print:shadow-none print:border-0 print:rounded-none p-6 sm:p-10">
          <header className="flex items-center justify-between gap-4 border-b border-borde pb-5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0">
                <Image src="/assets/sumate-app-icon.png" alt="" fill className="object-cover" />
              </div>
              <span className="text-xl font-extrabold text-accion tracking-tight">Súmate</span>
            </div>
            <p className="text-xs text-texto-tenue text-right">
              Emitida el {fechaLarga(constancia.emitida)}
            </p>
          </header>

          <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-texto tracking-tight">
            Constancia de voluntariado
          </h1>

          {constancia.totalHoras === 0 ? (
            <p className="mt-4 text-sm text-texto-secundario leading-relaxed">
              Todavía no tienes horas confirmadas. Cuando una organización registre tus horas y
              las aceptes en el detalle de la actividad, aparecerán aquí.
            </p>
          ) : (
            <>
              <p className="mt-4 text-[15px] text-texto-secundario leading-relaxed">
                Se deja constancia de que <strong className="text-texto">{constancia.voluntario}</strong>{" "}
                ({constancia.correo}) realizó{" "}
                <strong className="text-texto">{formatoHoras(constancia.totalHoras)}</strong> de
                voluntariado en las siguientes actividades:
              </p>

              <div className="mt-6 space-y-5">
                {constancia.actividades.map((actividad) => (
                  <section
                    key={actividad.activityId}
                    aria-label={actividad.nombre}
                    className="rounded-2xl border border-borde p-4 break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-bold text-texto">{actividad.nombre}</h2>
                      <span className="text-sm font-bold text-texto">
                        {formatoHoras(actividad.totalHoras)}
                      </span>
                    </div>
                    {actividad.organizador && (
                      <p className="text-xs text-texto-tenue mt-0.5">Organizada por {actividad.organizador}</p>
                    )}
                    <table className="mt-3 w-full text-sm">
                      <caption className="sr-only">Horas por jornada en {actividad.nombre}</caption>
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-texto-tenue">
                          <th className="py-1.5 font-semibold">Jornada</th>
                          <th className="py-1.5 font-semibold text-right">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actividad.jornadas.map((j) => (
                          <tr key={j.jornada} className="border-t border-borde-suave">
                            <td className="py-1.5 text-texto-secundario">{formatoJornada(j.jornada)}</td>
                            <td className="py-1.5 text-right font-semibold text-texto">
                              {formatoHoras(j.horas)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-superficie print:bg-fondo print:border print:border-borde-fuerte px-4 py-3">
                <span className="text-sm font-semibold text-texto-secundario">Total de horas confirmadas</span>
                <span className="text-lg font-extrabold text-texto">
                  {formatoHoras(constancia.totalHoras)}
                </span>
              </div>
            </>
          )}

          <p className="mt-8 text-xs text-texto-tenue leading-relaxed">
            Solo se incluyen las horas que el voluntario confirmó. Las horas pendientes o en
            reclamo no forman parte de esta constancia.
          </p>
        </article>
      </div>
    </div>
  );
}
