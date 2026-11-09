import { abrirMiActividad, expect, test, USUARIOS } from './apoyo';

// Actividad de la semilla que terminó hace 3 días, con Luis y Sofía aceptados
const ACTIVIDAD = 'Jornada de reforestación en el Tunari';

// "AAAA-MM-DD" + n días
function sumarDias(dia: string, n: number) {
  const [anio, mes, d] = dia.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, d + n));
  return fecha.toISOString().slice(0, 10);
}

test('Dos jornadas, reclamo, corrección y confirmación: el total y la constancia solo cuentan horas confirmadas', async ({
  abrirSesion,
}) => {
  // ── Ana registra dos jornadas ──────────────────────────────────────────────
  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, ACTIVIDAD);
  await expect(ana.getByRole('heading', { name: 'Horas de voluntariado' })).toBeVisible();

  const fecha = ana.getByLabel('Fecha de la jornada');
  const primerDia = (await fecha.getAttribute('min'))!;

  await ana.getByLabel('Horas de Luis Mamani').fill('4');
  await ana.getByLabel('Horas de Sofía Vargas').fill('4');
  await ana.getByRole('button', { name: 'Registrar jornada' }).click();
  await expect(ana.getByText('Jornada registrada')).toBeVisible();

  await fecha.fill(sumarDias(primerDia, 1));
  await ana.getByLabel('Horas de Luis Mamani').fill('3');
  await ana.getByRole('button', { name: 'Registrar jornada' }).click();
  await expect(ana.getByRole('listitem', { name: /^Luis Mamani,/ })).toHaveCount(2);

  // ── Luis acepta la primera y reclama la segunda ───────────────────────────
  const luis = await abrirSesion(USUARIOS.luis);
  await luis.goto(ana.url());
  await expect(luis.getByText(/Total confirmado:\s*0 h/)).toBeVisible();

  const jornadas = luis.getByRole('listitem', { name: /^Jornada del/ });
  await expect(jornadas).toHaveCount(2);
  await jornadas.nth(0).getByRole('button', { name: 'Aceptar horas' }).click();
  await expect(jornadas.nth(0).getByText('Confirmada')).toBeVisible();
  await expect(luis.getByText(/Total confirmado:\s*4 h/)).toBeVisible();

  await jornadas.nth(1).getByRole('button', { name: 'Reclamar' }).click();
  // Sin motivo no se envía
  await luis.getByRole('button', { name: 'Enviar reclamo' }).click();
  await expect(luis.getByRole('alert')).toContainText('Escribe el motivo');
  await luis.getByLabel('Motivo del reclamo').fill('Me quedé hasta las 18:00, fueron 5 horas.');
  await luis.getByRole('button', { name: 'Enviar reclamo' }).click();
  await expect(jornadas.nth(1).getByText('Reclamada')).toBeVisible();

  // La constancia solo tiene la jornada confirmada
  await luis.goto('/constancia');
  await expect(luis.getByRole('heading', { name: 'Constancia de voluntariado' })).toBeVisible();
  await expect(luis.getByText(/Total de horas confirmadas\s*4 h/)).toBeVisible();

  // ── Ana ve el reclamo y corrige ───────────────────────────────────────────
  await ana.reload();
  await expect(ana.getByText('Hay 1 reclamo')).toBeVisible();
  const reclamada = ana.getByRole('listitem', { name: /^Luis Mamani,/ }).filter({ hasText: 'Reclamada' });
  await expect(reclamada).toContainText('Me quedé hasta las 18:00');
  await reclamada.getByRole('button', { name: 'Corregir horas' }).click();
  await ana.getByLabel('Horas correctas').fill('5');
  await ana.getByRole('button', { name: 'Guardar corrección' }).click();
  await expect(ana.getByText('Hay 1 reclamo')).toBeHidden();

  // ── La corrección necesita nueva aceptación ───────────────────────────────
  await luis.goto(ana.url());
  await expect(jornadas.nth(1)).toContainText('corregidas');
  await expect(jornadas.nth(1).getByText('Pendiente')).toBeVisible();
  // Todavía no suma: sigue en 4 h hasta que Luis acepte
  await expect(luis.getByText(/Total confirmado:\s*4 h/)).toBeVisible();

  await jornadas.nth(1).getByRole('button', { name: 'Aceptar horas' }).click();
  await expect(luis.getByText(/Total confirmado:\s*9 h/)).toBeVisible();

  // ── Constancia final: 4 h + 5 h confirmadas ───────────────────────────────
  await luis.goto('/constancia');
  const actividad = luis.getByRole('region', { name: ACTIVIDAD });
  await expect(actividad).toContainText('Organizada por Ana Rojas');
  await expect(actividad.getByRole('row')).toHaveCount(3); // encabezado + 2 jornadas
  await expect(luis.getByText(/Total de horas confirmadas\s*9 h/)).toBeVisible();
  await expect(luis.getByRole('button', { name: 'Imprimir constancia' })).toBeEnabled();

  // Sofía no respondió: sus horas pendientes no están en su constancia
  const sofia = await abrirSesion(USUARIOS.sofia);
  await sofia.goto('/constancia');
  await expect(sofia.getByText('Todavía no tienes horas confirmadas')).toBeVisible();
});
