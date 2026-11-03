import path from 'node:path';
import { test, expect } from '@playwright/test';

// Oculta el botón de Next.js que solo aparece en desarrollo
const estilos = path.join(__dirname, 'fixtures', 'ocultar-next.css');

test('La pantalla de inicio de sesión se ve igual que la aprobada', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page).toHaveScreenshot('inicio-de-sesion.png', { fullPage: true, stylePath: estilos });
});

test('La pantalla de registro se ve igual que la aprobada', async ({ page }) => {
  await page.goto('/auth/signup');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveScreenshot('registro.png', { fullPage: true, stylePath: estilos });
});
