import { test, expect } from '@playwright/test';
import { USUARIOS, iniciarSesion } from './apoyo';

test('María inicia sesión y llega a Explorar', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.maria);
  await expect(page.getByRole('button', { name: 'Perfil de usuario' })).toBeVisible();
});

test('Con una contraseña incorrecta se le dice qué revisar', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Correo electrónico').fill(USUARIOS.maria);
  await page.getByLabel('Contraseña', { exact: true }).fill('otra-clave');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('Credenciales incorrectas. Revisa tu email y contraseña.')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('Sin sesión, Mis actividades lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/my-activities');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
});
