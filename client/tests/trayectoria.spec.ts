import { test, expect } from '@playwright/test';
import { USUARIOS, iniciarSesion } from './apoyo';

test('María ve en Mis solicitudes la solicitud que espera respuesta', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.maria);
  await page.getByRole('link', { name: 'Mis solicitudes' }).click();
  await expect(page).toHaveURL(/\/recently/);
  await expect(page.getByRole('link', { name: 'Limpieza del Parque Tunari' })).toContainText(
    'Solicitud pendiente',
  );
});

test('Quien aún no participa ve el estado vacío y una acción para explorar', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.pedro);
  await page.getByRole('link', { name: 'Mis solicitudes' }).click();
  await expect(page).toHaveURL(/\/recently/);
  await expect(page.getByRole('heading', { name: 'Sin participaciones' })).toBeVisible();
  await page.getByRole('link', { name: 'Explorar actividades' }).click();
  await expect(page).toHaveURL(/\/explore/);
});

// Clase 20: la tarea de la prueba sin indicaciones
test('Luis encuentra si ya aceptaron su solicitud sin revisar tarjeta por tarjeta', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.luis);
  await page.getByRole('link', { name: 'Mis solicitudes' }).click();
  await expect(page).toHaveURL(/\/recently/);

  // Cada estado tiene su grupo con la cantidad
  await expect(page.getByRole('region', { name: /Aceptadas/ })).toContainText('Acompañamiento en el hogar de ancianos');
  await expect(page.getByRole('region', { name: /Pendientes de respuesta/ })).toContainText(
    'Limpieza del Parque Tunari',
  );
  await expect(page.getByRole('region', { name: /Rechazadas/ })).toContainText('Mural comunitario en la Cancha');
});
