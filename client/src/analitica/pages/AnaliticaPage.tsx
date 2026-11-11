import type { Conteo } from "@/analitica/context/analiticaTypes";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import { ErrorView } from "@/shared/components/ErrorView";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { usePageData } from "@/shared/hooks/usePageData";

/** "75 %" o "—" si nadie empezó todavía. */
function porcentaje(parte: number, total: number) {
  return total === 0 ? "—" : `${Math.round((parte / total) * 100)} %`;
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const textoProps = (props: Record<string, unknown>) =>
  Object.entries(props)
    .map(([clave, valor]) => `${clave}: ${String(valor)}`)
    .join(", ");

function Barra({ etiqueta, valor, maximo, color }: { etiqueta: string; valor: number; maximo: number; color: string }) {
  const ancho = maximo === 0 ? 0 : Math.round((valor / maximo) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-semibold text-slate-600">{etiqueta}</span>
      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${ancho}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-bold text-slate-900 tabular-nums">{valor}</span>
    </div>
  );
}

function FilaTipo({ tipo, conteo, total = false }: { tipo: string; conteo: Conteo; total?: boolean }) {
  const celda = `py-2 text-right tabular-nums ${total ? "font-bold text-slate-900" : "text-slate-700"}`;
  return (
    <tr className={total ? "border-t-2 border-slate-200" : "border-t border-slate-100"}>
      <th scope="row" className={`py-2 text-left ${total ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
        {tipo}
      </th>
      <td className={celda}>{conteo.iniciadas}</td>
      <td className={celda}>{conteo.enviadas}</td>
      <td className={celda}>{porcentaje(conteo.enviadas, conteo.iniciadas)}</td>
    </tr>
  );
}

/** Panel de analítica: cuántas personas empiezan y cuántas terminan la postulación. */
export default function AnaliticaPage() {
  useDocumentTitle("Analítica - Súmate");
  const { getAnalitica } = useAnalitica();
  const { data, error } = usePageData(getAnalitica, []);

  if (error) return <ErrorView error={error} />;
  if (!data) {
    return <p className="py-8 text-center text-sm text-slate-500">Cargando la analítica...</p>;
  }

  const { total, conCupos, listaDeEspera } = data.postulacion;
  const seQuedan = total.iniciadas - total.enviadas;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-10">
      <div className="pt-4 lg:pt-5 max-w-3xl">
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">Analítica</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Cuántas personas empiezan a postular y cuántas terminan. Se registra la acción, no quién la hizo.
        </p>

        <section
          aria-labelledby="embudo-postulacion"
          className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5"
        >
          <h2 id="embudo-postulacion" className="text-base font-bold text-slate-900">
            Postular a una actividad
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Empieza con <code className="font-mono text-[#4f43c4]">postulacion_iniciada</code> al abrir la
            confirmación y termina con <code className="font-mono text-[#4f43c4]">postulacion_enviada</code> cuando
            la solicitud quedó guardada.
          </p>

          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold text-slate-500">Iniciaron</dt>
              <dd className="text-2xl font-extrabold text-slate-900 tabular-nums">{total.iniciadas}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-semibold text-slate-500">Enviaron</dt>
              <dd className="text-2xl font-extrabold text-slate-900 tabular-nums">{total.enviadas}</dd>
            </div>
            <div className="rounded-xl bg-[#f1effd] p-3">
              <dt className="text-xs font-semibold text-[#4f43c4]">Terminan</dt>
              <dd className="text-2xl font-extrabold text-[#4f43c4] tabular-nums">
                {porcentaje(total.enviadas, total.iniciadas)}
              </dd>
            </div>
          </dl>

          {/* Las barras repiten lo que dicen los números de arriba */}
          <div className="mt-4 space-y-2" aria-hidden="true">
            <Barra etiqueta="Iniciaron" valor={total.iniciadas} maximo={total.iniciadas} color="bg-[#6355de]" />
            <Barra etiqueta="Enviaron" valor={total.enviadas} maximo={total.iniciadas} color="bg-emerald-600" />
          </div>
          {seQuedan > 0 && (
            <p className="mt-3 text-sm font-semibold text-rose-700">
              Se quedan en la confirmación {seQuedan} de {total.iniciadas} ({porcentaje(seQuedan, total.iniciadas)}).
            </p>
          )}

          <table className="mt-5 w-full text-sm">
            <caption className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 pb-1">
              Por tipo de postulación
            </caption>
            <thead>
              <tr className="text-xs text-slate-500">
                <th scope="col" className="py-1 text-left font-semibold">Tipo</th>
                <th scope="col" className="py-1 text-right font-semibold">Iniciaron</th>
                <th scope="col" className="py-1 text-right font-semibold">Enviaron</th>
                <th scope="col" className="py-1 text-right font-semibold">Terminan</th>
              </tr>
            </thead>
            <tbody>
              <FilaTipo tipo="Con cupos" conteo={conCupos} />
              <FilaTipo tipo="Lista de espera" conteo={listaDeEspera} />
            </tbody>
            <tfoot>
              <FilaTipo tipo="Total" conteo={total} total />
            </tfoot>
          </table>
        </section>

        <section aria-labelledby="ultimos-eventos" className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h2 id="ultimos-eventos" className="text-base font-bold text-slate-900">
            Últimos eventos
          </h2>
          {data.ultimos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Todavía no hay eventos.</p>
          ) : (
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th scope="col" className="py-1 pr-2 text-left font-semibold">Evento</th>
                  <th scope="col" className="py-1 pr-2 text-left font-semibold">Propiedades</th>
                  <th scope="col" className="py-1 text-right font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimos.map((evento, i) => (
                  <tr key={`${evento.fecha}-${i}`} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-2 font-mono text-slate-800 break-all">{evento.evento}</td>
                    <td className="py-2 pr-2 font-mono text-slate-600 break-all">{textoProps(evento.props)}</td>
                    <td className="py-2 text-right text-slate-500 whitespace-nowrap">{fechaHora(evento.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
