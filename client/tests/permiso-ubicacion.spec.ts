import { test, expect, type Page } from '@playwright/test';
import { USUARIOS, iniciarSesion } from './apoyo';

// Clase 22, patrón 6 (permisos sin explicar): antes, cada búsqueda pedía la
// ubicación del dispositivo aunque solo se escribiera texto y sin decir para qué.
// Ahora se pide solo al aplicar el filtro de distancia, que lo explica antes.

// Reemplaza la geolocalización del navegador por una que cuenta los pedidos
async function contarPedidosDeUbicacion(page: Page, disponible: boolean) {
  await page.addInitScript((disponible) => {
    const w = window as unknown as { pedidosDeUbicacion: number };
    w.pedidosDeUbicacion = 0;
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition(ok: PositionCallback, error?: PositionErrorCallback) {
          w.pedidosDeUbicacion++;
          if (disponible) {
            ok({ coords: { latitude: -16.5, longitude: -68.13 } } as GeolocationPosition);
          } else {
            error?.({ code: 1, message: 'denegado' } as GeolocationPositionError);
          }
        },
      },
    });
  }, disponible);
}

const pedidos = (page: Page) =>
  page.evaluate(() => (window as unknown as { pedidosDeUbicacion: number }).pedidosDeUbicacion);

async function buscar(page: Page, texto: string) {
  const buscador = page.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill(texto);
  await buscador.press('Enter');
}

async function aplicarFiltroDeDistancia(page: Page) {
  await page.getByRole('button', { name: /^Abrir filtros/ }).click();
  await page.getByRole('button', { name: /Más filtros/ }).click();
  await expect(page.getByText('Solo si eliges una distancia te pediremos tu ubicación')).toBeVisible();
  // El control empieza en «Cualquier distancia»: con Inicio queda en 1 km
  await page.getByRole('slider').press('Home');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
}

test('Buscar por texto no pide la ubicación', async ({ page }) => {
  await contarPedidosDeUbicacion(page, true);
  await iniciarSesion(page, USUARIOS.maria);
  await page.goto('/search');
  await buscar(page, 'Mural');
  await expect(page.getByRole('link', { name: 'Mural comunitario en la Cancha' })).toBeVisible();
  expect(await pedidos(page)).toBe(0);
});

test('La ubicación se pide solo al aplicar el filtro de distancia, que explica para qué', async ({ page }) => {
  await contarPedidosDeUbicacion(page, true);
  await iniciarSesion(page, USUARIOS.maria);
  await page.goto('/search');
  await aplicarFiltroDeDistancia(page);
  await expect.poll(() => pedidos(page)).toBe(1);
});

test('Sin ubicación, se dice por qué y se puede seguir buscando sin el filtro', async ({ page }) => {
  await contarPedidosDeUbicacion(page, false);
  await iniciarSesion(page, USUARIOS.maria);
  await page.goto('/search');
  await buscar(page, 'Mural');
  await aplicarFiltroDeDistancia(page);

  await expect(page.getByRole('heading', { name: 'No pudimos usar tu ubicación' })).toBeVisible();
  await expect(page.getByText('escribir tu zona en el buscador')).toBeVisible();

  await page.getByRole('button', { name: 'Quitar el filtro de distancia' }).click();
  await expect(page.getByRole('link', { name: 'Mural comunitario en la Cancha' })).toBeVisible();
  expect(await pedidos(page)).toBe(1);
});
