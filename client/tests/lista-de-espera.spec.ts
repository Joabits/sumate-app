import { test, expect, USUARIOS, abrirActividad, abrirMiActividad } from './apoyo';
import type { Page } from '@playwright/test';

// Actividades de la semilla con un solo cupo, ya ocupado
const TALLER = 'Taller de primeros auxilios'; // el cupo es de Luis
const CHARLA = 'Charla de reciclaje en el colegio'; // el cupo es de Carlos

async function unirmeALaListaDeEspera(page: Page, actividad: string) {
  await abrirActividad(page, actividad);
  await page.getByRole('button', { name: 'Unirme a la lista de espera' }).click();
  await page.getByRole('button', { name: 'Sí, unirme a la lista' }).click();
  await expect(page.getByText('Te uniste a la lista de espera.')).toBeVisible();
}

test('Con el cupo lleno la solicitud espera y, si alguien se retira, la primera en espera pasa a aceptada', async ({
  abrirSesion,
}) => {
  const sofia = await abrirSesion(USUARIOS.sofia);
  await unirmeALaListaDeEspera(sofia, TALLER);
  await expect(sofia.getByRole('button', { name: /En lista de espera, puesto 1/ })).toBeVisible();

  const carlos = await abrirSesion(USUARIOS.carlos);
  await unirmeALaListaDeEspera(carlos, TALLER);
  await expect(carlos.getByRole('button', { name: /En lista de espera, puesto 2/ })).toBeVisible();

  // Luis tenía el único cupo y lo libera
  const luis = await abrirSesion(USUARIOS.luis);
  await abrirActividad(luis, TALLER);
  await luis.getByRole('button', { name: 'Retirarme de la actividad' }).click();
  await luis.getByLabel('Motivo del retiro').fill('No consigo transporte ese día.');
  await luis.getByRole('button', { name: 'Sí, retirarme' }).click();
  await expect(
    luis.getByText('Te retiraste. Tu cupo pasó a la primera persona de la lista de espera.'),
  ).toBeVisible();

  // Sofía era la primera en espera: ahora está aceptada. Carlos sube al puesto 1
  await sofia.reload();
  await expect(sofia.getByRole('button', { name: 'Retirarme de la actividad' })).toBeVisible();
  await carlos.reload();
  await expect(carlos.getByRole('button', { name: /En lista de espera, puesto 1/ })).toBeVisible();

  // La organizadora ve a Sofía confirmada y a Carlos esperando
  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, TALLER);
  await expect(ana.getByRole('button', { name: 'Ver participantes de la actividad' })).toContainText(
    '1 participante confirmado',
  );
  await expect(ana.getByRole('list', { name: 'Lista de espera' })).toContainText('1. Carlos Quispe');
});

test('Quien está en la lista de espera puede salir de ella', async ({ abrirSesion }) => {
  const maria = await abrirSesion(USUARIOS.maria);
  await unirmeALaListaDeEspera(maria, CHARLA);

  await maria.getByRole('button', { name: /En lista de espera, puesto 1/ }).click();
  await maria.getByRole('button', { name: 'Sí, salir de la lista' }).click();
  await expect(maria.getByText('Saliste de la lista de espera.')).toBeVisible();
  await expect(maria.getByRole('button', { name: 'Unirme a la lista de espera' })).toBeVisible();

  // Persistencia: al recargar sigue fuera de la lista
  await maria.reload();
  await expect(maria.getByRole('button', { name: 'Unirme a la lista de espera' })).toBeVisible();
});
