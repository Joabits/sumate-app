import { test, expect, USUARIOS, abrirMiActividad, iniciarSesion } from './apoyo';

// Actividad de la semilla con un cupo: Luis aceptado, María pendiente y Sofía en lista de espera
const TALLER = 'Taller de huertos urbanos';
const MOTIVO = 'Se suspende por lluvia: el parque estará cerrado.';

test('Ana cancela una oportunidad con postulantes en tres estados y todos ven el motivo', async ({
  abrirSesion,
}) => {
  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, TALLER);
  await ana.getByRole('button', { name: 'Cancelar actividad' }).click();
  await ana.getByLabel('Motivo de la cancelación').fill(MOTIVO);
  await ana.getByRole('button', { name: 'Sí, cancelar actividad' }).click();
  await expect(ana.getByText('Actividad cancelada. Los voluntarios verán el motivo.')).toBeVisible();

  // Todos ven la cancelación: aviso con el motivo y ninguna acción disponible
  await expect(ana.getByRole('heading', { name: 'Actividad cancelada por la organización' })).toBeVisible();
  await expect(ana.getByText(MOTIVO)).toBeVisible();
  await expect(ana.getByRole('button', { name: 'Actividad cancelada', exact: true })).toBeDisabled();

  // La organizadora ve a quién afectó y en qué estado estaba cada uno
  const afectados = ana.getByRole('list', { name: 'Postulantes afectados' });
  await expect(afectados.getByRole('listitem').filter({ hasText: 'Luis Mamani' })).toContainText(
    'Estaba: Aceptada',
  );
  await expect(afectados.getByRole('listitem').filter({ hasText: 'María López' })).toContainText(
    'Estaba: Pendiente',
  );
  await expect(afectados.getByRole('listitem').filter({ hasText: 'Sofía Vargas' })).toContainText(
    'Estaba: En lista de espera',
  );
  // Ninguna solicitud puede aceptarse después
  await expect(ana.getByRole('button', { name: /Aceptar solicitud/ })).toHaveCount(0);

  // Persistencia: al recargar sigue cancelada
  await ana.reload();
  await expect(ana.getByRole('heading', { name: 'Actividad cancelada por la organización' })).toBeVisible();

  // Cada voluntario afectado ve el motivo en Mis solicitudes, sección Historial
  const afectadosPorCorreo: [string, string][] = [
    [USUARIOS.luis, 'aceptada'],
    [USUARIOS.maria, 'pendiente'],
    [USUARIOS.sofia, 'en lista de espera'],
  ];
  for (const [correo, estadoAnterior] of afectadosPorCorreo) {
    const voluntario = await abrirSesion(correo);
    await voluntario.goto('/recently');
    await voluntario.getByRole('tab', { name: /Historial/ }).click();
    await expect(voluntario.getByRole('link', { name: TALLER })).toContainText(
      `Cancelada por la organización (estabas: ${estadoAnterior}). Motivo: ${MOTIVO}`,
    );
  }

  // Nadie más puede solicitar: ya no aparece en Buscar y su detalle no tiene el botón
  const pedro = await abrirSesion(USUARIOS.pedro);
  await pedro.goto('/search');
  const buscador = pedro.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill(TALLER);
  await buscador.press('Enter');
  await expect(pedro.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();
  await pedro.goto(ana.url());
  await expect(pedro.getByText(MOTIVO)).toBeVisible();
  await expect(pedro.getByRole('button', { name: 'Actividad cancelada', exact: true })).toBeDisabled();
});

test('Sin motivo no se puede cancelar y se le dice qué falta', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.ana);
  await abrirMiActividad(page, 'Taller de programación para jóvenes');
  await page.getByRole('button', { name: 'Cancelar actividad' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar actividad' }).click();
  await expect(
    page.getByText('Escribe el motivo de la cancelación. Los voluntarios lo verán.'),
  ).toBeVisible();

  // Sigue publicada
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cerrar convocatoria' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Actividad cancelada por la organización' })).toHaveCount(0);
});
