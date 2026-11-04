import { test, expect, USUARIOS, abrirActividad, abrirMiActividad } from './apoyo';
import type { Page } from '@playwright/test';

// Actividad de la semilla con 10 cupos libres, organizada por Ana
const ACTIVIDAD = 'Recolección de libros para la biblioteca';

async function solicitarParticipar(page: Page) {
  await abrirActividad(page, ACTIVIDAD);
  await page.getByRole('button', { name: 'Solicitar participar' }).click();
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByText('¡Solicitud enviada! El organizador la revisará pronto.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Solicitud pendiente/ })).toBeVisible();
}

test('María solicita participar, Ana la acepta y María ya ocupa un cupo', async ({ abrirSesion }) => {
  const maria = await abrirSesion(USUARIOS.maria);
  await solicitarParticipar(maria);

  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, ACTIVIDAD);
  await ana.getByRole('button', { name: 'Aceptar solicitud de María López' }).click();
  await expect(ana.getByText('Aceptaste a María López. Ya ocupa un cupo.')).toBeVisible();
  await expect(ana.getByRole('button', { name: 'Ver participantes de la actividad' })).toContainText(
    '1 participante confirmado',
  );

  // Relación y persistencia: María lo ve al recargar
  await maria.reload();
  await expect(maria.getByRole('button', { name: 'Cancelar participación en el evento' })).toBeVisible();
});

test('Carlos solicita participar y Ana rechaza su solicitud', async ({ abrirSesion }) => {
  const carlos = await abrirSesion(USUARIOS.carlos);
  await solicitarParticipar(carlos);

  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, ACTIVIDAD);
  await ana.getByRole('button', { name: 'Rechazar solicitud de Carlos Quispe' }).click();
  await expect(ana.getByText('Rechazaste la solicitud de Carlos Quispe.')).toBeVisible();

  await carlos.reload();
  await expect(carlos.getByRole('button', { name: 'Solicitud rechazada' })).toBeDisabled();
});
