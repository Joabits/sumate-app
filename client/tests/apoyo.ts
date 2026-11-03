import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

// Usuarios de la semilla (server/scripts/seed_pruebas.py). Contraseña de todos: Demo12345
export const USUARIOS = {
  ana: 'ana@sumate.dev', // organizadora
  luis: 'luis@sumate.dev',
  sofia: 'sofia@sumate.dev',
  carlos: 'carlos@sumate.dev',
  maria: 'maria@sumate.dev',
  pedro: 'nuevo@sumate.dev', // no tiene actividades ni solicitudes
};
export const CONTRASENA = 'Demo12345';

export async function iniciarSesion(page: Page, correo: string) {
  await page.goto('/auth/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/explore/);
}

// El voluntario encuentra la actividad en Buscar y entra a su detalle
export async function abrirActividad(page: Page, nombre: string) {
  await page.goto('/search');
  const buscador = page.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill(nombre);
  await buscador.press('Enter');
  await page.getByRole('link', { name: nombre }).click();
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible();
}

// La organizadora entra a su actividad desde Mis actividades
export async function abrirMiActividad(page: Page, nombre: string) {
  await page.goto('/my-activities');
  await page.getByRole('link', { name: nombre }).click();
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible();
}

// Cada persona usa su propio navegador, así la organizadora y los voluntarios
// tienen la sesión abierta al mismo tiempo. Al terminar la prueba se cierran.
export const test = base.extend<{ abrirSesion: (correo: string) => Promise<Page> }>({
  abrirSesion: async ({ browser }, entregar) => {
    const navegadores: BrowserContext[] = [];
    await entregar(async (correo) => {
      const navegador = await browser.newContext();
      navegadores.push(navegador);
      const page = await navegador.newPage();
      await iniciarSesion(page, correo);
      return page;
    });
    for (const navegador of navegadores) {
      await navegador.close();
    }
  },
});

export { expect };
