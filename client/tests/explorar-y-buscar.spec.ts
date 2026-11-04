import { test, expect } from '@playwright/test';
import { USUARIOS, iniciarSesion } from './apoyo';

test('María ve en Explorar las actividades de otros y entra a una', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.maria);
  await page.getByRole('link', { name: 'Torneo deportivo solidario' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Torneo deportivo solidario' })).toBeVisible();
});

test('María busca una actividad por su nombre y la encuentra', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.maria);
  await page.goto('/search');
  const buscador = page.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill('Mural');
  await buscador.press('Enter');
  await expect(page.getByRole('link', { name: 'Mural comunitario en la Cancha' })).toBeVisible();
});

test('Si la búsqueda no encuentra nada, se lo dice y le ofrece ajustar los filtros', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.maria);
  await page.goto('/search');
  const buscador = page.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill('xyz sin coincidencias');
  await buscador.press('Enter');
  await expect(page.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajustar filtros de búsqueda' }).click();
  await expect(page.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
});
