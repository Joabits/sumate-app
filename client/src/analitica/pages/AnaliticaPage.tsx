import type { Embudo, FlujoRechazado, MotivoRechazo } from "@/analitica/context/analiticaTypes";
import { useAnalitica } from "@/analitica/hooks/useAnalitica";
import { ErrorView } from "@/shared/components/ErrorView";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { usePageData } from "@/shared/hooks/usePageData";

/** "75 %" o "—" si no hay base para calcularlo. */
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
    .join(", ") || "—";

const NOMBRE_FLUJO: Record<FlujoRechazado, string> = {
  postulacion: "Postular",
  retiro: "Retirarse",
  crear_actividad: "Crear actividad",
  publicar_actividad: "Publicar actividad",
  horas: "Horas de voluntariado",
};

const NOMBRE_MOTIVO: Record<MotivoRechazo, string> = {
  fuera_de_plazo: "Fuera de plazo",
  sin_cupos: "Sin cupos",
  sin_permiso: "Sin permiso",
  validacion: "Datos inválidos",
  actividad_cancelada: "Actividad cancelada",
  conflicto: "Conflicto con el estado actual",
};

type Caida = { desde: string; hasta: string; perdidos: number; base: number };

/** Entre qué pasos se pierde más gente (en proporción). null si nadie se pierde. */
function mayorCaida(embudo: Embudo): Caida | null {
  let mayor: Caida | null = null;
  for (let i = 1; i < embudo.pasos.length; i++) {
    const anterior = embudo.pasos[i - 1];
    const paso = embudo.pasos[i];
    const perdidos = anterior.cantidad - paso.cantidad;
    if (anterior.cantidad === 0 || perdidos <= 0) continue;
    if (!mayor || perdidos / anterior.cantidad > mayor.perdidos / mayor.base) {
      mayor = { desde: anterior.etiqueta, hasta: paso.etiqueta, perdidos, base: anterior.cantidad };
    }
  }
  return mayor;
}

function EmbudoSeccion({ embudo }: { embudo: Embudo }) {
  const inicio = embudo.pasos[0]?.cantidad ?? 0;
  const caida = mayorCaida(embudo);
  const id = `embudo-${embudo.clave}`;

  return (
    <section aria-labelledby={id} className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
      <h2 id={id} className="text-base font-bold text-slate-900">
        {embudo.titulo}
      </h2>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{embudo.pregunta}</p>

      {/* Las barras repiten lo que dice la tabla */}
      <div className="mt-4 space-y-2" aria-hidden="true">
        {embudo.pasos.map((paso, i) => {
          const ancho = inicio === 0 ? 0 : Math.min(100, Math.round((paso.cantidad / inicio) * 100));
          return (
            <div key={`${paso.evento}-${i}`} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold text-slate-600 truncate">{paso.etiqueta}</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${i === embudo.pasos.length - 1 ? "bg-emerald-600" : "bg-[#6355de]"}`}
                  style={{ width: `${ancho}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-bold text-slate-900 tabular-nums">
                {paso.cantidad}
              </span>
            </div>
          );
        })}
      </div>

      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Pasos de {embudo.titulo}</caption>
        <thead>
          <tr className="text-xs text-slate-500">
            <th scope="col" className="py-1 text-left font-semibold">Paso</th>
            <th scope="col" className="py-1 text-right font-semibold">Llegaron</th>
            <th scope="col" className="py-1 text-right font-semibold">Del inicio</th>
            <th scope="col" className="py-1 text-right font-semibold">Caída</th>
          </tr>
        </thead>
        <tbody>
          {embudo.pasos.map((paso, i) => {
            const anterior = embudo.pasos[i - 1];
            const perdidos = anterior ? anterior.cantidad - paso.cantidad : 0;
            return (
              <tr key={`${paso.evento}-${i}`} className="border-t border-slate-100">
                <th scope="row" className="py-2 text-left font-medium text-slate-700">
                  {paso.etiqueta}
                  <span className="block font-mono text-[11px] font-normal text-[#4f43c4]">{paso.evento}</span>
                </th>
                <td className="py-2 text-right tabular-nums text-slate-900">{paso.cantidad}</td>
                <td className="py-2 text-right tabular-nums text-slate-700">{porcentaje(paso.cantidad, inicio)}</td>
                <td className="py-2 text-right tabular-nums text-rose-700">
                  {anterior && perdidos > 0 ? `−${porcentaje(perdidos, anterior.cantidad)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {caida ? (
        <p className="mt-3 text-sm font-semibold text-rose-700">
          Mayor caída: de «{caida.desde}» a «{caida.hasta}» se pierden {caida.perdidos} de {caida.base} (
          {porcentaje(caida.perdidos, caida.base)}).
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Todavía no hay caída entre pasos.</p>
      )}
      {embudo.rechazos > 0 && (
        <p className="mt-1 text-xs text-slate-600">
          Se frenó {embudo.rechazos} {embudo.rechazos === 1 ? "vez" : "veces"} por un error de validación o permiso.
        </p>
      )}
    </section>
  );
}

/** Panel de analítica: un embudo por flujo principal, la caída entre pasos y los errores que frenan. */
export default function AnaliticaPage() {
  useDocumentTitle("Analítica - Súmate");
  const { getAnalitica } = useAnalitica();
  const { data, error } = usePageData(getAnalitica, []);

  if (error) return <ErrorView error={error} />;
  if (!data) {
    return <p className="py-8 text-center text-sm text-slate-500">Cargando la analítica...</p>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-10">
      <div className="pt-4 lg:pt-5 max-w-3xl">
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">Analítica</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Dónde se traba la gente en cada flujo de Súmate. Se registra la acción, no quién la hizo.
        </p>

        {data.embudos.map((embudo) => (
          <EmbudoSeccion key={embudo.clave} embudo={embudo} />
        ))}

        <section aria-labelledby="errores" className="mt-5 rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h2 id="errores" className="text-base font-bold text-slate-900">
            Errores que frenan la tarea
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            <code className="font-mono text-[#4f43c4]">accion_rechazada</code> con el motivo de una lista fija.
          </p>
          {data.rechazos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Todavía no hay errores registrados.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th scope="col" className="py-1 text-left font-semibold">Flujo</th>
                  <th scope="col" className="py-1 text-left font-semibold">Motivo</th>
                  <th scope="col" className="py-1 text-right font-semibold">Veces</th>
                </tr>
              </thead>
              <tbody>
                {data.rechazos.map((r) => (
                  <tr key={`${r.flujo}-${r.motivo}`} className="border-t border-slate-100">
                    <td className="py-2 text-slate-700">{NOMBRE_FLUJO[r.flujo] ?? r.flujo}</td>
                    <td className="py-2 text-slate-700">{NOMBRE_MOTIVO[r.motivo] ?? r.motivo}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-slate-900">{r.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
