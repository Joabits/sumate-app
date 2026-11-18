/**
 * Recibe la cobertura que manda cada página instrumentada (src/cobertura.ts)
 * y la guarda en .nyc_output/, de donde `nyc report` arma el reporte.
 * Solo existe con COBERTURA=1: en desarrollo normal y en producción no se usa.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

export const coberturaActiva = process.env.COBERTURA === "1";

const carpeta = path.resolve(__dirname, "..", ".nyc_output");
const ID_DE_PAGINA = /^[0-9a-f-]{36}$/;

type Contadores = Record<string, number | number[]>;
type Archivo = { s: Contadores; f: Contadores; b: Contadores } & Record<string, unknown>;
type Cobertura = Record<string, Archivo>;

// Lo acumulado de cada página. Los envíos pueden llegar desordenados, así que
// se combinan quedándose con el mayor valor de cada contador.
const porPagina = new Map<string, Cobertura>();

function mayor(a: number | number[], b: number | number[]) {
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => Math.max(v, b[i] ?? 0));
  return Math.max(Number(a), Number(b));
}

function combinar(previa: Cobertura | undefined, nueva: Cobertura): Cobertura {
  if (!previa) return nueva;
  for (const [archivo, datos] of Object.entries(nueva)) {
    const antes = previa[archivo];
    if (!antes) {
      previa[archivo] = datos;
      continue;
    }
    for (const tipo of ["s", "f", "b"] as const) {
      for (const [id, valor] of Object.entries(datos[tipo])) {
        antes[tipo][id] = id in antes[tipo] ? mayor(antes[tipo][id], valor) : valor;
      }
    }
  }
  return previa;
}

export function recibirCobertura(req: IncomingMessage, res: ServerResponse) {
  const partes: Buffer[] = [];
  req.on("data", (parte: Buffer) => partes.push(parte));
  req.on("end", () => {
    try {
      const { pagina, cobertura } = JSON.parse(Buffer.concat(partes).toString("utf8"));
      if (typeof pagina !== "string" || !ID_DE_PAGINA.test(pagina)) throw new Error("página inválida");
      const acumulada = combinar(porPagina.get(pagina), cobertura as Cobertura);
      porPagina.set(pagina, acumulada);
      mkdirSync(carpeta, { recursive: true });
      // Síncrono: dos envíos de la misma página no se pisan al escribir
      writeFileSync(path.join(carpeta, `${pagina}.json`), JSON.stringify(acumulada));
      res.statusCode = 204;
    } catch {
      res.statusCode = 400;
    }
    res.end();
  });
}
