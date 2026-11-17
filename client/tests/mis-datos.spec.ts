import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { CONTRASENA, expect, test, USUARIOS } from './apoyo';

// Tarea 10: Mis datos y salida honesta. Usuarios de server/scripts/seed_pruebas.py
const VALERIA = 'valeria@sumate.dev'; // elimina su cuenta (la semilla la vuelve a crear)
const TOMAS = 'tomas@sumate.dev'; // en espera en la actividad donde Valeria tiene el cupo
const FERIA = 'Feria de reciclaje en la plaza';

type EventoGuardado = { evento: string; props: Record<string, unknown>; estado: number };

// Cada evento que la página manda al backend (POST /api/eventos) y lo que respondió
function escucharEventos(page: Page): EventoGuardado[] {
  const eventos: EventoGuardado[] = [];
  page.on('response', (respuesta) => {
    const pedido = respuesta.request();
    if (pedido.method() === 'POST' && new URL(pedido.url()).pathname.endsWith('/api/eventos')) {
      eventos.push({ ...pedido.postDataJSON(), estado: respuesta.status() });
    }
  });
  return eventos;
}

// Dos eventos pueden llegar en cualquier orden: se comparan ordenados por nombre
function ordenados(eventos: EventoGuardado[]) {
  return eventos.map(({ evento, props }) => ({ evento, props })).sort((a, b) => a.evento.localeCompare(b.evento));
}

async function abrirMisDatos(page: Page) {
  await page.goto('/mis-datos');
  await expect(page.getByRole('heading', { level: 1, name: 'Mis datos' })).toBeVisible();
}

test('Mis datos muestra lo que la app guarda y lo descarga en JSON', async ({ abrirSesion }) => {
  const luis = await abrirSesion(USUARIOS.luis);
  const eventos = escucharEventos(luis);
  await abrirMisDatos(luis);

  await expect(luis.getByRole('region', { name: 'Perfil' })).toContainText(USUARIOS.luis);
  await expect(luis.getByRole('region', { name: /Mis solicitudes/ })).toBeVisible();

  const [descarga] = await Promise.all([
    luis.waitForEvent('download'),
    luis.getByRole('button', { name: 'Descargar mis datos (JSON)' }).click(),
  ]);
  expect(descarga.suggestedFilename()).toBe('mis-datos-sumate.json');
  const archivo = JSON.parse(await readFile((await descarga.path())!, 'utf8'));
  expect(archivo.perfil.correo).toBe(USUARIOS.luis);
  expect(archivo.solicitudes.length).toBeGreaterThan(0);
  expect(Object.keys(archivo)).toEqual(
    expect.arrayContaining(['descargadoEl', 'perfil', 'actividadesOrganizadas', 'solicitudes', 'horas']),
  );

  await expect.poll(() => eventos.map((e) => e.evento)).toEqual(['mis_datos_descargados']);
  expect(eventos[0]).toMatchObject({ props: {}, estado: 201 });
});

test('Quien organiza actividades por terminar no puede eliminar la cuenta y ve por qué y qué hacer', async ({
  abrirSesion,
}) => {
  const ana = await abrirSesion(USUARIOS.ana);
  const eventos = escucharEventos(ana);
  await abrirMisDatos(ana);

  await ana.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
  const dialogo = ana.getByRole('alertdialog');
  await expect(dialogo.getByRole('heading', { name: 'Todavía no puedes eliminar tu cuenta' })).toBeVisible();
  // Por qué: las actividades que bloquean. Qué hacer: cancelarlas o esperar
  await expect(dialogo).toContainText(FERIA);
  await expect(dialogo).toContainText('cancélalas desde Mis actividades');
  // No hay un botón para eliminar igual: la regla no se salta
  await expect(dialogo.getByRole('button', { name: 'Eliminar mi cuenta' })).toHaveCount(0);
  await expect(dialogo.getByRole('button', { name: 'Ir a Mis actividades' })).toBeVisible();

  await expect
    .poll(() => ordenados(eventos))
    .toEqual([
      { evento: 'accion_rechazada', props: { flujo: 'eliminar_cuenta', motivo: 'actividades_por_terminar' } },
      { evento: 'eliminacion_cuenta_iniciada', props: {} },
    ]);
  for (const evento of eventos) expect(evento.estado).toBe(201);

  await dialogo.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialogo).toBeHidden();
});

test('Eliminar la cuenta: confirmación honesta, el cupo pasa al primero en espera y la cuenta ya no entra', async ({
  abrirSesion,
}) => {
  const valeria = await abrirSesion(VALERIA);
  const eventos = escucharEventos(valeria);
  await abrirMisDatos(valeria);
  await expect(valeria.getByRole('region', { name: /Mis solicitudes/ })).toContainText(FERIA);

  await valeria.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
  const dialogo = valeria.getByRole('alertdialog');
  await expect(dialogo.getByRole('heading', { name: 'Eliminar mi cuenta' })).toBeVisible();

  // Consecuencias explicadas: qué se borra y qué se conserva
  await expect(dialogo).toContainText('No podrás volver a iniciar sesión con esta cuenta');
  await expect(dialogo).toContainText('se libera para la primera persona en espera');
  await expect(dialogo).toContainText('«Usuario eliminado»');
  // Sin culpa: nada de «¿Seguro?» ni «te vamos a extrañar»
  await expect(dialogo).not.toContainText(/seguro|extrañ|abandon/i);

  // Botones del mismo tamaño (con 1 px de margen: el diálogo entra con una animación)
  await expect(dialogo).toHaveCSS('opacity', '1');
  const cancelar = dialogo.getByRole('button', { name: 'Cancelar' });
  const eliminar = dialogo.getByRole('button', { name: 'Eliminar mi cuenta' });
  const [cajaCancelar, cajaEliminar] = [await cancelar.boundingBox(), await eliminar.boundingBox()];
  expect(Math.abs(cajaCancelar!.width - cajaEliminar!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(cajaCancelar!.height - cajaEliminar!.height)).toBeLessThanOrEqual(1);

  // Sin pasos de más: un clic y queda eliminada
  await eliminar.click();
  await expect(valeria.getByText('Tu cuenta fue eliminada.')).toBeVisible();
  await expect(valeria).toHaveURL(/\/$|\/auth\/login/);

  await expect
    .poll(() => ordenados(eventos))
    .toEqual([
      { evento: 'cuenta_eliminada', props: {} },
      { evento: 'eliminacion_cuenta_iniciada', props: {} },
    ]);
  for (const evento of eventos) expect(evento.estado).toBe(201);
  // Ningún dato de la persona viaja en los eventos
  const enviado = JSON.stringify(eventos);
  for (const dato of [VALERIA, 'Valeria', FERIA]) expect(enviado).not.toContain(dato);

  // Esa cuenta ya no puede iniciar sesión
  await valeria.goto('/auth/login');
  await valeria.getByLabel('Correo electrónico').fill(VALERIA);
  await valeria.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA);
  await valeria.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(valeria.getByText(/Credenciales incorrectas|No encontramos ninguna cuenta/)).toBeVisible();
  await expect(valeria).toHaveURL(/\/auth\/login/);

  // El cupo de Valeria pasó a Tomás, que estaba en espera
  const tomas = await abrirSesion(TOMAS);
  await tomas.goto('/mis-datos');
  const solicitudes = tomas.getByRole('region', { name: /Mis solicitudes/ });
  await expect(solicitudes.getByRole('listitem').filter({ hasText: FERIA })).toContainText('aceptada');
});
