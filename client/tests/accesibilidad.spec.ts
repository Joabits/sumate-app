import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { USUARIOS, abrirActividad, iniciarSesion } from './apoyo';

// Revisa la página con axe usando las reglas WCAG 2.0 A y AA
async function revisarAccesibilidad(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('nextjs-portal') // botón de Next.js que solo existe en desarrollo
    .analyze();
  // Si falla, el mensaje dice qué regla no se cumple y en qué elementos
  const problemas = resultado.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(problemas).toEqual([]);
}

test.describe('Accesibilidad', () => {
  test('Inicio de sesión', async ({ page }) => {
    await page.goto('/auth/login');
    await revisarAccesibilidad(page);
  });

  test('Registro', async ({ page }) => {
    await page.goto('/auth/signup');
    await revisarAccesibilidad(page);
  });

  test('Explorar', async ({ page }) => {
    await iniciarSesion(page, USUARIOS.maria);
    await revisarAccesibilidad(page);
  });

  test('Buscar con resultados', async ({ page }) => {
    await iniciarSesion(page, USUARIOS.maria);
    await page.goto('/search');
    const buscador = page.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
    await buscador.fill('Taller');
    await buscador.press('Enter');
    await expect(page.getByRole('link', { name: 'Taller de programación para jóvenes' })).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test('Detalle de una actividad', async ({ page }) => {
    await iniciarSesion(page, USUARIOS.maria);
    await abrirActividad(page, 'Torneo deportivo solidario');
    await revisarAccesibilidad(page);
  });

  test('Mis actividades', async ({ page }) => {
    await iniciarSesion(page, USUARIOS.ana);
    await page.goto('/my-activities');
    await expect(page.getByRole('link', { name: 'Limpieza del Parque Tunari' })).toBeVisible();
    await revisarAccesibilidad(page);
  });

  test('Mi trayectoria', async ({ page }) => {
    await iniciarSesion(page, USUARIOS.maria);
    await page.goto('/recently');
    await expect(page.getByRole('link', { name: 'Limpieza del Parque Tunari' })).toBeVisible();
    await revisarAccesibilidad(page);
  });
});

test.describe('Área táctil (Fitts)', () => {
  // 44 px es el mínimo recomendado para tocar con el dedo sin equivocarse
  async function medirAlto(page: Page, nombre: string) {
    const caja = await page.getByRole('button', { name: nombre }).boundingBox();
    return caja?.height ?? 0;
  }

  test('Los botones de iniciar sesión y solicitar participar miden al menos 44 px', async ({ page }) => {
    await page.goto('/auth/login');
    expect(await medirAlto(page, 'Iniciar sesión')).toBeGreaterThanOrEqual(44);

    await iniciarSesion(page, USUARIOS.pedro);
    await abrirActividad(page, 'Torneo deportivo solidario');
    expect(await medirAlto(page, 'Solicitar participar')).toBeGreaterThanOrEqual(44);
  });

  test('Los botones para aceptar o rechazar una solicitud miden al menos 44 px', async ({ page }) => {
    await iniciarSesion(page, USUARIOS.ana);
    await page.goto('/my-activities');
    await page.getByRole('link', { name: 'Limpieza del Parque Tunari' }).click();
    expect(await medirAlto(page, 'Aceptar solicitud de Luis Mamani')).toBeGreaterThanOrEqual(44);
    expect(await medirAlto(page, 'Rechazar solicitud de Luis Mamani')).toBeGreaterThanOrEqual(44);
  });
});
