const ZONA = "America/La_Paz";

/** "2026-11-05" → "Jueves, 5 de noviembre de 2026" (sin correr el día por la zona horaria). */
export function formatoJornada(jornada: string): string {
  const [anio, mes, dia] = jornada.split("-").map(Number);
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** 4 → "4 h", 4.5 → "4,5 h" */
export function formatoHoras(horas: number): string {
  return `${horas.toLocaleString("es-BO", { maximumFractionDigits: 2 })} h`;
}

/** Día (AAAA-MM-DD) de una fecha ISO, en hora de Bolivia. */
export function diaEnBolivia(fechaIso: string | Date): string {
  return new Date(fechaIso).toLocaleDateString("en-CA", { timeZone: ZONA });
}

/** Hoy (AAAA-MM-DD) en hora de Bolivia. */
export function hoyEnBolivia(): string {
  return diaEnBolivia(new Date());
}
