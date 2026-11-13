import { abrirActividad, expect, test, USUARIOS } from './apoyo';

// Clase 22: retirarse tiene que verse y costar lo mismo que postular, y el plazo
// para hacerlo se explica antes de comprometerse.
// Actividades de la semilla (server/scripts/seed_pruebas.py) que las otras pruebas
// no tocan para Luis, Sofía ni María.
const CON_CUPOS = 'Clasificación de donaciones en el banco de alimentos';
const LLENA = 'Lectura de cuentos en el Hospital del Niño'; // el único cupo es de María

test('Retirar una solicitud pendiente se ve como un botón y cuesta los mismos toques que postular', async ({
  abrirSesion,
}) => {
  const luis = await abrirSesion(USUARIOS.luis);
  await abrirActividad(luis, CON_CUPOS);

  // Postular: 2 toques
  await luis.getByRole('button', { name: 'Solicitar participar' }).click();
  await luis.getByRole('button', { name: 'Enviar solicitud' }).click();

  // El estado se muestra como estado y la salida como un botón que dice lo que hace
  await expect(luis.getByText('Solicitud pendiente', { exact: true })).toBeVisible();
  await expect(luis.getByRole('alertdialog')).toHaveCount(0);
  await expect(luis.getByRole('button', { name: /Solicitud pendiente/ })).toHaveCount(0);

  // Retirarse: también 2 toques
  await luis.getByRole('button', { name: 'Retirar solicitud', exact: true }).click();
  await luis
    .getByRole('alertdialog', { name: 'Retirar mi solicitud' })
    .getByRole('button', { name: 'Sí, retirar solicitud' })
    .click();

  await expect(luis.getByText('Retiraste tu solicitud.')).toBeVisible();
  await expect(luis.getByRole('button', { name: 'Solicitar participar' })).toBeVisible();
});

test('Quien está en la lista de espera ve un botón para salir de ella', async ({ abrirSesion }) => {
  const sofia = await abrirSesion(USUARIOS.sofia);
  await abrirActividad(sofia, LLENA);

  await sofia.getByRole('button', { name: 'Unirme a la lista de espera' }).click();
  await sofia.getByRole('button', { name: 'Sí, unirme a la lista' }).click();

  await expect(sofia.getByText(/^En lista de espera, puesto \d+$/)).toBeVisible();
  await sofia.getByRole('button', { name: 'Salir de la lista', exact: true }).click();
  await sofia
    .getByRole('alertdialog', { name: 'Salir de la lista de espera' })
    .getByRole('button', { name: 'Sí, salir de la lista' })
    .click();

  await expect(sofia.getByText('Saliste de la lista de espera.')).toBeVisible();
  await expect(sofia.getByRole('button', { name: 'Unirme a la lista de espera' })).toBeVisible();
});

test('Antes de postular, la confirmación explica hasta cuándo se puede retirar', async ({ abrirSesion }) => {
  // Con cupos
  const maria = await abrirSesion(USUARIOS.maria);
  await abrirActividad(maria, CON_CUPOS);
  await maria.getByRole('button', { name: 'Solicitar participar' }).click();
  const postular = maria.getByRole('alertdialog', { name: 'Solicitar participar' });
  await expect(postular).toContainText('hasta 24 horas antes de la actividad');
  await postular.getByRole('button', { name: 'Cancelar', exact: true }).click();

  // Lista de espera
  const luis = await abrirSesion(USUARIOS.luis);
  await abrirActividad(luis, LLENA);
  await luis.getByRole('button', { name: 'Unirme a la lista de espera' }).click();
  const unirme = luis.getByRole('alertdialog', { name: 'Unirme a la lista de espera' });
  await expect(unirme).toContainText('hasta 24 horas antes de la actividad');
  await unirme.getByRole('button', { name: 'Cancelar', exact: true }).click();
});
