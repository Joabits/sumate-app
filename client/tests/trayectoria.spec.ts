import { test, expect } from '@playwright/test';
import { USUARIOS, iniciarSesion } from './apoyo';

test('María ve en Mi trayectoria la solicitud que espera respuesta', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.maria);
  await page.getByRole('link', { name: 'Mi trayectoria' }).click();
  await expect(page).toHaveURL(/\/recently/);
  await expect(page.getByRole('link', { name: 'Limpieza del Parque Tunari' })).toContainText(
    'Solicitud pendiente',
  );
});

test('Quien aún no participa ve el estado vacío y una acción para explorar', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.pedro);
  await page.getByRole('link', { name: 'Mi trayectoria' }).click();
  await expect(page).toHaveURL(/\/recently/);
  await expect(page.getByRole('heading', { name: 'Sin participaciones' })).toBeVisible();
  await page.getByRole('link', { name: 'Explorar actividades' }).click();
  await expect(page).toHaveURL(/\/explore/);
});
