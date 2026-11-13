import { test, expect, USUARIOS, abrirActividad, abrirMiActividad } from './apoyo';

// Actividades de la semilla (server/scripts/seed_pruebas.py)
const COMEDOR = 'Apoyo en el comedor popular'; // en 5 días, 1 cupo de María, Carlos en espera, Sofía pendiente
const RIO = 'Limpieza del río Rocha'; // empieza en menos de 24 horas, Sofía aceptada

test('Un aceptado se retira a tiempo con motivo: libera el cupo y entra el primero en espera', async ({
  abrirSesion,
}) => {
  const maria = await abrirSesion(USUARIOS.maria);
  await abrirActividad(maria, COMEDOR);
  await maria.getByRole('button', { name: 'Retirarme de la actividad' }).click();

  const dialogo = maria.getByRole('alertdialog', { name: 'Retirarme de la actividad' });
  await expect(dialogo).toBeVisible();

  // Sin motivo no se puede retirar
  await dialogo.getByRole('button', { name: 'Sí, retirarme' }).click();
  await expect(dialogo.getByRole('alert')).toHaveText('Escribe el motivo por el que te retiras.');

  await dialogo.getByLabel('Motivo del retiro').fill('Tengo un examen final ese día.');
  await dialogo.getByRole('button', { name: 'Sí, retirarme' }).click();
  await expect(
    maria.getByText('Te retiraste. Tu cupo pasó a la primera persona de la lista de espera.'),
  ).toBeVisible();
  // Ya no ocupa el cupo: la actividad está llena con Carlos, así que le ofrece la lista de espera
  await expect(maria.getByRole('button', { name: 'Unirme a la lista de espera' })).toBeVisible();

  // Persistencia: en Mis solicitudes aparece en el historial como retirada
  await maria.goto('/recently');
  await maria.getByRole('tab', { name: /Historial/ }).click();
  await expect(maria.getByRole('region', { name: /^Te retiraste/ })).toContainText(COMEDOR);

  // Carlos era el primero en espera: ahora está aceptado
  const carlos = await abrirSesion(USUARIOS.carlos);
  await abrirActividad(carlos, COMEDOR);
  await expect(carlos.getByRole('button', { name: 'Retirarme de la actividad' })).toBeVisible();

  // La organizadora ve a un confirmado y la lista de espera vacía
  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, COMEDOR);
  await expect(ana.getByRole('button', { name: 'Ver participantes de la actividad' })).toContainText(
    '1 participante confirmado',
  );
  await expect(ana.getByRole('list', { name: 'Lista de espera' })).toHaveCount(0);
});

test('Un pendiente retira su solicitud sin escribir motivo', async ({ abrirSesion }) => {
  const sofia = await abrirSesion(USUARIOS.sofia);
  await abrirActividad(sofia, COMEDOR);
  await sofia.getByRole('button', { name: 'Retirar solicitud', exact: true }).click();

  const dialogo = sofia.getByRole('alertdialog', { name: 'Retirar mi solicitud' });
  await expect(dialogo.getByLabel('Motivo del retiro')).toHaveCount(0);
  await dialogo.getByRole('button', { name: 'Sí, retirar solicitud' }).click();
  await expect(sofia.getByText('Retiraste tu solicitud.')).toBeVisible();

  await sofia.reload();
  await expect(sofia.getByText('Solicitud pendiente', { exact: true })).toHaveCount(0);
});

test('Fuera de plazo la app no permite retirarse y la persona sigue aceptada', async ({ abrirSesion }) => {
  const sofia = await abrirSesion(USUARIOS.sofia);
  await abrirActividad(sofia, RIO);
  await sofia.getByRole('button', { name: 'Retirarme de la actividad' }).click();

  const dialogo = sofia.getByRole('alertdialog', { name: 'Ya no puedes retirarte' });
  await expect(dialogo).toContainText('Faltan menos de 24 horas');
  // No hay cómo confirmar el retiro: solo cerrar el aviso
  await expect(dialogo.getByRole('button', { name: /retirarme/i })).toHaveCount(0);
  await dialogo.getByRole('button', { name: 'Entendido' }).click();

  // Al recargar sigue aceptada
  await sofia.reload();
  await expect(sofia.getByRole('button', { name: 'Retirarme de la actividad' })).toBeVisible();
});
