import path from 'node:path';
import { test, expect } from '@playwright/test';
import { USUARIOS, abrirMiActividad, iniciarSesion } from './apoyo';

// Ubicación en Cochabamba para el botón "Usar mi ubicación actual"
test.use({
  geolocation: { latitude: -17.3936, longitude: -66.157 },
  permissions: ['geolocation'],
});

// Dentro de 10 días a las 09:00, con el formato del campo de fecha y hora
function fechaFutura() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 10);
  const dia = fecha.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
  return `${dia}T09:00`;
}

test('Ana publica una oportunidad y María la encuentra al buscar', async ({ page }) => {
  // Un nombre distinto en cada corrida para que la prueba pase las veces que haga falta
  const nombre = `Jornada de reciclaje ${Date.now()}`;

  await iniciarSesion(page, USUARIOS.ana);

  // Crear la actividad
  await page.goto('/my-activities');
  await page.getByRole('button', { name: 'Crear nueva actividad' }).click();
  const selectorDeArchivo = page.waitForEvent('filechooser');
  await page.getByText('Toca para subir una fotografía').click();
  await (await selectorDeArchivo).setFiles(path.join(__dirname, 'fixtures', 'portada.png'));
  await page.getByLabel('Nombre de la actividad').fill(nombre);
  await page.getByLabel('Fecha de realización').fill(fechaFutura());
  await page.getByLabel('Cantidad de cupos').fill('5');
  await page.getByRole('button', { name: 'Registrar actividad' }).click();
  await expect(page.getByText('¡Actividad creada exitosamente!')).toBeVisible();

  // Completar lo que pide la publicación: descripción, causas y ubicación
  await page.getByRole('link', { name: nombre }).click();
  await page.getByRole('button', { name: 'Activar modo edición' }).click();

  await page.getByRole('button', { name: 'Editar descripción' }).click();
  await page
    .getByRole('textbox', { name: 'Describe la actividad' })
    .fill('Recogemos plástico y cartón en las calles del barrio. Trae guantes y agua.');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Descripción actualizada.')).toBeVisible();

  await page.getByRole('button', { name: 'Editar causas' }).click();
  await page.getByRole('button', { name: 'Medio Ambiente' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Causas temáticas actualizadas.')).toBeVisible();

  await page.getByRole('button', { name: 'Editar ubicación en mapa' }).click();
  await page.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
  await page.getByLabel('Nombre o referencia del lugar').fill('Plaza 14 de Septiembre');
  await page.getByRole('button', { name: 'Confirmar Ubicación' }).click();
  await expect(page.getByText('Ubicación actualizada con éxito.')).toBeVisible({ timeout: 20_000 });
  // La pantalla ya muestra el lugar: la actividad tiene todo lo que pide la publicación
  await expect(
    page.getByText('Plaza 14 de Septiembre', { exact: true }).filter({ visible: true }),
  ).toBeVisible();

  // Publicar: aparece el mensaje y la organizadora ya puede cerrar la convocatoria
  await page.getByRole('button', { name: 'Publicar actividad' }).click();
  await expect(page.getByText('¡Actividad publicada con éxito!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar convocatoria' })).toBeVisible();

  // Persistencia: al recargar sigue publicada
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cerrar convocatoria' })).toBeVisible();

  // Relación: otra persona la encuentra al buscar
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Perfil de usuario' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await iniciarSesion(page, USUARIOS.maria);
  await page.goto('/search');
  const buscador = page.getByRole('textbox', { name: 'Buscar actividades por nombre, causa o lugar' });
  await buscador.fill(nombre);
  await buscador.press('Enter');
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
});

test('Ana no puede publicar un borrador incompleto y se le dice qué falta', async ({ page }) => {
  await iniciarSesion(page, USUARIOS.ana);
  await abrirMiActividad(page, 'Colecta de ropa de invierno');
  await page.getByRole('button', { name: 'Publicar actividad' }).click();
  await expect(
    page.getByText(
      'Para publicar la actividad debes registrar: ubicación en el mapa, descripción, al menos una causa temática.',
    ),
  ).toBeVisible();

  // Sigue en borrador al recargar
  await page.reload();
  await expect(page.getByRole('button', { name: 'Publicar actividad' })).toBeVisible();
});

// Mejora por el feedback de la Clase 19: antes había que ir a Mis actividades para crear
test('Ana crea una actividad desde Explorar sin pasar por Mis actividades', async ({ page }) => {
  const nombre = `Feria del libro usado ${Date.now()}`;

  await iniciarSesion(page, USUARIOS.ana);
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Crear nueva actividad' }).click();

  const selectorDeArchivo = page.waitForEvent('filechooser');
  await page.getByText('Toca para subir una fotografía').click();
  await (await selectorDeArchivo).setFiles(path.join(__dirname, 'fixtures', 'portada.png'));
  await page.getByLabel('Nombre de la actividad').fill(nombre);
  await page.getByLabel('Fecha de realización').fill(fechaFutura());
  await page.getByLabel('Cantidad de cupos').fill('8');
  await page.getByRole('button', { name: 'Registrar actividad' }).click();
  await expect(page.getByText('¡Actividad creada exitosamente!')).toBeVisible();

  // Queda como borrador en Mis actividades, lista para completarla y publicarla
  await expect(page).toHaveURL(/\/my-activities/);
  await expect(page.getByRole('link', { name: nombre })).toContainText('Borrador');
});
