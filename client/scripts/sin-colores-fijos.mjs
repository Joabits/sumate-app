// Falla si una pantalla o componente escribe un color a mano en vez de usar un
// token de src/styles/tokens.css. Corre en GitHub Actions: `pnpm tokens:check`.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'src');

const PALETA =
  /(?<![\w-])(bg|text|border(?:-[trblxyse])?|ring-offset|ring|from|to|via|fill|stroke|outline|divide|shadow|decoration|accent|caret|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-\d{2,3})?(?![\w-])/g;
const VALOR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(|hsla?\(|oklch\(/g;

const hallazgos = [];

function revisar(archivo) {
  const relativo = path.relative(SRC, archivo).replaceAll('\\', '/');
  readFileSync(archivo, 'utf8')
    .split(/\r?\n/)
    .forEach((linea, i) => {
      for (const m of [...linea.matchAll(PALETA), ...linea.matchAll(VALOR)]) {
        hallazgos.push(`${relativo}:${i + 1}  ${m[0]}`);
      }
    });
}

function recorrer(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) recorrer(ruta);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) revisar(ruta);
  }
}

recorrer(SRC);

if (hallazgos.length) {
  console.error(`Colores fijos encontrados (${hallazgos.length}). Usa un token de src/styles/tokens.css:\n`);
  console.error(hallazgos.join('\n'));
  process.exit(1);
}
console.log('Sin colores fijos: todas las pantallas usan los tokens de src/styles/tokens.css');
