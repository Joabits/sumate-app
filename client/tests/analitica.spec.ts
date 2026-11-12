import path from 'node:path';
import type { Page, Request } from '@playwright/test';
import { abrirActividad, abrirMiActividad, expect, test, USUARIOS } from './apoyo';

// Actividades de la semilla solo para estas pruebas (server/scripts/seed_pruebas.py)
const CON_CUPOS = 'Clasificación de donaciones en el banco de alimentos';
const LLENA = 'Lectura de cuentos en el Hospital del Niño'; // el único cupo es de María

type EventoGuardado = { evento: string; props: Record<string, unknown>; estado: number };

// Dentro de 10 días a las 09:00, con el formato del campo de fecha y hora
function fechaFutura() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 10);
  const dia = fecha.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
  return `${dia}T09:00`;
}

// Cada evento que la página manda al backend (POST /api/eventos) y lo que respondió.
// Las pruebas llegan al detalle buscando la actividad: esa búsqueda se ignora salvo que se pida.
function escucharEventos(page: Page, ignorar: string[] = ['busqueda_realizada']): EventoGuardado[] {
  const eventos: EventoGuardado[] = [];
  page.on('response', (respuesta) => {
    const pedido = respuesta.request();
    if (pedido.method() === 'POST' && new URL(pedido.url()).pathname.endsWith('/api/eventos')) {
      const enviado = pedido.postDataJSON();
      if (!ignorar.includes(enviado.evento)) eventos.push({ ...enviado, estado: respuesta.status() });
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

// Lo que mandó la página, sin el estado HTTP, para comparar con lo esperado
const enviados = (eventos: EventoGuardado[]) => eventos.map(({ evento, props }) => ({ evento, props }));

// Ningún dato de la persona, de la actividad ni texto escrito viaja en los eventos
function sinDatosPersonales(eventos: EventoGuardado[], datos: string[]) {
  const texto = JSON.stringify(eventos);
  for (const dato of datos) expect(texto).not.toContain(dato);
}

const RETIRO = 'Pintado de murales en la escuela'; // Luis aceptado, María en espera
const RIO = 'Limpieza del río Rocha'; // empieza en menos de 24 horas, Sofía aceptada
const HORAS = 'Campaña de vacunación de mascotas'; // terminó hace 2 días, Carlos aceptado
const BORRADOR = 'Colecta de ropa de invierno'; // le falta todo para publicarse

test('Retirarse registra el inicio y el retiro guardado, sin el motivo escrito', async ({ abrirSesion }) => {
  const luis = await abrirSesion(USUARIOS.luis);
  const eventos = escucharEventos(luis);
  await abrirActividad(luis, RETIRO);
  const motivo = 'Viajo a Oruro por un tema familiar';

  await luis.getByRole('button', { name: 'Retirarme de la actividad' }).click();
  // Sin motivo: el retiro se frena por validación
  await luis.getByRole('button', { name: 'Sí, retirarme' }).click();
  await expect(luis.getByRole('alert')).toBeVisible();
  await luis.getByLabel('Motivo del retiro').fill(motivo);
  await luis.getByRole('button', { name: 'Sí, retirarme' }).click();
  await expect(luis.getByText(/Te retiraste/)).toBeVisible();

  await expect
    .poll(() => enviados(eventos))
    .toEqual([
      { evento: 'retiro_iniciado', props: { estado: 'aceptada' } },
      { evento: 'accion_rechazada', props: { flujo: 'retiro', motivo: 'validacion' } },
      { evento: 'retiro_confirmado', props: { estado: 'aceptada', entro_de_lista_de_espera: true } },
    ]);
  expect(eventos.map((e) => e.estado)).toEqual([201, 201, 201]);
  sinDatosPersonales(eventos, [USUARIOS.luis, 'Luis', RETIRO, motivo]);
});

test('Un retiro fuera de plazo registra el inicio y el rechazo con motivo fuera_de_plazo', async ({
  abrirSesion,
}) => {
  const sofia = await abrirSesion(USUARIOS.sofia);
  const eventos = escucharEventos(sofia);
  await abrirActividad(sofia, RIO);

  await sofia.getByRole('button', { name: 'Retirarme de la actividad' }).click();
  await expect(sofia.getByRole('alertdialog', { name: 'Ya no puedes retirarte' })).toBeVisible();

  await expect
    .poll(() => enviados(eventos))
    .toEqual([
      { evento: 'retiro_iniciado', props: { estado: 'aceptada' } },
      { evento: 'accion_rechazada', props: { flujo: 'retiro', motivo: 'fuera_de_plazo' } },
    ]);
  expect(eventos.map((e) => e.estado)).toEqual([201, 201]);
});

test('Crear una actividad registra el inicio, el error de validación y el borrador guardado', async ({
  abrirSesion,
}) => {
  const ana = await abrirSesion(USUARIOS.ana);
  const eventos = escucharEventos(ana);
  const nombre = `Feria de lectura ${Date.now()}`;
  await ana.goto('/my-activities');

  await ana.getByRole('button', { name: 'Crear nueva actividad' }).click();
  await ana.getByLabel('Nombre de la actividad').fill(nombre);
  await ana.getByLabel('Fecha de realización').fill(fechaFutura());
  await ana.getByLabel('Cantidad de cupos').fill('5');
  // Sin portada: se frena por validación
  await ana.getByRole('button', { name: 'Registrar actividad' }).click();
  await expect(ana.getByText('Datos inválidos')).toBeVisible();

  // El formulario se vacía después del error: se vuelve a llenar con la portada
  const selectorDeArchivo = ana.waitForEvent('filechooser');
  await ana.getByText('Toca para subir una fotografía').click();
  await (await selectorDeArchivo).setFiles(path.join(__dirname, 'fixtures', 'portada.png'));
  await ana.getByLabel('Nombre de la actividad').fill(nombre);
  await ana.getByLabel('Fecha de realización').fill(fechaFutura());
  await ana.getByLabel('Cantidad de cupos').fill('5');
  await ana.getByRole('button', { name: 'Registrar actividad' }).click();
  await expect(ana.getByText('¡Actividad creada exitosamente!')).toBeVisible();

  await expect
    .poll(() => enviados(eventos))
    .toEqual([
      { evento: 'actividad_creacion_iniciada', props: {} },
      { evento: 'accion_rechazada', props: { flujo: 'crear_actividad', motivo: 'validacion' } },
      { evento: 'actividad_creada', props: {} },
    ]);
  expect(eventos.map((e) => e.estado)).toEqual([201, 201, 201]);
  sinDatosPersonales(eventos, [USUARIOS.ana, 'Ana', nombre]);
});

test('Publicar un borrador incompleto registra el rechazo por validación', async ({ abrirSesion }) => {
  const ana = await abrirSesion(USUARIOS.ana);
  const eventos = escucharEventos(ana);
  await abrirMiActividad(ana, BORRADOR);

  await ana.getByRole('button', { name: 'Publicar actividad' }).click();
  await expect(ana.getByText('Requisitos incompletos')).toBeVisible();

  await expect
    .poll(() => enviados(eventos))
    .toEqual([{ evento: 'accion_rechazada', props: { flujo: 'publicar_actividad', motivo: 'validacion' } }]);
});

test('Una búsqueda sin resultados se registra sin el texto buscado', async ({ abrirSesion }) => {
  const maria = await abrirSesion(USUARIOS.maria);
  const eventos = escucharEventos(maria, []);
  const texto = 'xilofonistas submarinos';

  await maria.goto('/search');
  const buscador = maria.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill(texto);
  await buscador.press('Enter');
  await expect(maria.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();

  await expect
    .poll(() => enviados(eventos))
    .toEqual([
      {
        evento: 'busqueda_realizada',
        props: { con_texto: true, con_filtros: false, con_resultados: false },
      },
    ]);
  sinDatosPersonales(eventos, [texto, 'xilofonistas']);
});

test('Las horas registran cuántos participantes hubo y si el voluntario las aceptó', async ({ abrirSesion }) => {
  const ana = await abrirSesion(USUARIOS.ana);
  const eventosAna = escucharEventos(ana);
  await abrirMiActividad(ana, HORAS);
  await ana.getByLabel('Horas de Carlos Quispe').fill('3');
  await ana.getByRole('button', { name: 'Registrar jornada' }).click();
  await expect(ana.getByText('Jornada registrada')).toBeVisible();
  await expect
    .poll(() => enviados(eventosAna))
    .toEqual([{ evento: 'horas_registradas', props: { participantes: 1 } }]);

  const carlos = await abrirSesion(USUARIOS.carlos);
  const eventosCarlos = escucharEventos(carlos);
  await carlos.goto(ana.url());
  await carlos.getByRole('button', { name: 'Aceptar horas' }).click();
  await expect(carlos.getByText('Horas confirmadas')).toBeVisible();
  await expect
    .poll(() => enviados(eventosCarlos))
    .toEqual([{ evento: 'horas_respondidas', props: { respuesta: 'aceptadas' } }]);
  sinDatosPersonales([...eventosAna, ...eventosCarlos], ['Carlos', HORAS, USUARIOS.carlos]);
});

const escaparRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('El panel /analitica muestra un embudo por flujo con los números del backend', async ({ abrirSesion }) => {
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
  await expect(ana.getByRole('region', { name: 'Postular a una actividad' })).toBeVisible();
  const { embudos } = (await (await pedidos.at(-1)!.response())!.json()) as {
    embudos: { titulo: string; pasos: { etiqueta: string; cantidad: number }[] }[];
  };

  expect(embudos.map((e) => e.titulo)).toEqual([
    'Postular a una actividad',
    'Retirarse de una actividad',
    'Crear y publicar una actividad',
    'Horas de voluntariado',
    'Buscar actividades',
  ]);
  for (const embudo of embudos) {
    const region = ana.getByRole('region', { name: embudo.titulo });
    for (const paso of embudo.pasos) {
      const fila = region.getByRole('row', { name: new RegExp(`^${escaparRegex(paso.etiqueta)}`) });
      await expect(fila.getByRole('cell').first()).toHaveText(String(paso.cantidad));
    }
  }
  await expect(ana.getByRole('region', { name: 'Errores que frenan la tarea' })).toBeVisible();
  await expect(ana.getByRole('region', { name: 'Últimos eventos' })).toBeVisible();
});
