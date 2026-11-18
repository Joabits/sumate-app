/**
 * Lee el valor actual de un token de styles/tokens.css. Sirve para las
 * librerías que reciben el color como atributo (un SVG no entiende var()).
 */
export function leerToken(nombre: `--${string}`, respaldo = ""): string {
  if (typeof window === "undefined") return respaldo;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || respaldo;
}
