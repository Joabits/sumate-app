import type { Page, Request } from '@playwright/test';
import { abrirActividad, expect, test, USUARIOS } from './apoyo';

// Actividades de la semilla solo para estas pruebas (server/scripts/seed_pruebas.py)
const CON_CUPOS = 'Clasificación de donaciones en el banco de alimentos';
const LLENA = 'Lectura de cuentos en el Hospital del Niño'; // el único cupo es de María

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

test('Postular guarda un inicio al abrir la confirmación y un envío solo cuando la solicitud se guarda', async ({
  abrirSesion,
}) => {
  const carlos = await abrirSesion(USUARIOS.carlos);
  const eventos = escucharEventos(carlos);
  await abrirActividad(carlos, CON_CUPOS);
  const actividadId = new URL(carlos.url()).pathname.split('/').pop()!;

  // Abre la confirmación y la cierra sin enviar: queda solo el inicio
  await carlos.getByRole('button', { name: 'Solicitar participar' }).click();
  await carlos.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect.poll(() => eventos.map((e) => e.evento)).toEqual(['postulacion_iniciada']);

  // Vuelve a abrirla y envía la solicitud
  await carlos.getByRole('button', { name: 'Solicitar participar' }).click();
  await carlos.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(carlos.getByText('¡Solicitud enviada! El organizador la revisará pronto.')).toBeVisible();
  await expect
    .poll(() => eventos.map((e) => e.evento))
    .toEqual(['postulacion_iniciada', 'postulacion_iniciada', 'postulacion_enviada']);

  // El backend guardó los tres y cada uno lleva solo la propiedad definida
  for (const evento of eventos) {
    expect(evento.estado).toBe(201);
    expect(evento.props).toEqual({ lista_de_espera: false });
  }

  // Ningún dato de la persona ni de la actividad viaja en los eventos
  const enviado = JSON.stringify(eventos);
  for (const dato of [USUARIOS.carlos, 'Carlos', CON_CUPOS, actividadId]) {
    expect(enviado).not.toContain(dato);
  }
});

test('En una actividad llena los dos eventos dicen que la postulación fue a la lista de espera', async ({
  abrirSesion,
}) => {
  const carlos = await abrirSesion(USUARIOS.carlos);
  const eventos = escucharEventos(carlos);
  await abrirActividad(carlos, LLENA);

  await carlos.getByRole('button', { name: 'Unirme a la lista de espera' }).click();
  await carlos.getByRole('button', { name: 'Sí, unirme a la lista' }).click();
  await expect(carlos.getByText('Te uniste a la lista de espera.')).toBeVisible();

  await expect
    .poll(() => eventos.map(({ evento, props }) => ({ evento, props })))
    .toEqual([
      { evento: 'postulacion_iniciada', props: { lista_de_espera: true } },
      { evento: 'postulacion_enviada', props: { lista_de_espera: true } },
    ]);
  expect(eventos.map((e) => e.estado)).toEqual([201, 201]);
});

test('El panel /analitica muestra cuántos empiezan y cuántos terminan con los números del backend', async ({
  abrirSesion,
}) => {
  const ana = await abrirSesion(USUARIOS.ana);
  // En desarrollo React pide los datos dos veces y la página usa la última respuesta
  const pedidos: Request[] = [];
  ana.on('request', (pedido) => {
    if (pedido.method() === 'GET' && new URL(pedido.url()).pathname.endsWith('/api/analitica')) {
      pedidos.push(pedido);
    }
  });

  await ana.goto('/analitica');
  await expect(ana.getByRole('heading', { level: 1, name: 'Analítica' })).toBeVisible();
  const embudo = ana.getByRole('region', { name: 'Postular a una actividad' });
  await expect(embudo).toBeVisible();
  const { postulacion } = await (await pedidos.at(-1)!.response())!.json();

  const filas = [
    ['Con cupos', postulacion.con_cupos],
    ['Lista de espera', postulacion.lista_de_espera],
    ['Total', postulacion.total],
  ] as const;
  for (const [tipo, conteo] of filas) {
    const celdas = embudo.getByRole('row', { name: new RegExp(`^${tipo}`) }).getByRole('cell');
    await expect(celdas.nth(0)).toHaveText(String(conteo.iniciadas));
    await expect(celdas.nth(1)).toHaveText(String(conteo.enviadas));
  }
  await expect(ana.getByRole('region', { name: 'Últimos eventos' })).toBeVisible();
});
