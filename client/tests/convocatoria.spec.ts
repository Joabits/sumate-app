import { test, expect, USUARIOS, abrirActividad, abrirMiActividad } from './apoyo';

test('Ana cierra la convocatoria y Luis ya no puede solicitar participar', async ({ abrirSesion }) => {
  const luis = await abrirSesion(USUARIOS.luis);
  await abrirActividad(luis, 'Cine foro en el barrio');
  await expect(luis.getByRole('button', { name: 'Solicitar participar' })).toBeVisible();

  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, 'Cine foro en el barrio');
  await ana.getByRole('button', { name: 'Cerrar convocatoria' }).click();
  await expect(ana.getByText('Convocatoria cerrada exitosamente.')).toBeVisible();
  await expect(ana.getByRole('button', { name: 'Reabrir convocatoria' })).toBeVisible();

  await luis.reload();
  await expect(luis.getByRole('button', { name: 'Convocatoria cerrada' })).toBeDisabled();
});

test('Ana reabre una convocatoria cerrada y Luis puede volver a solicitar', async ({ abrirSesion }) => {
  const ana = await abrirSesion(USUARIOS.ana);
  await abrirMiActividad(ana, 'Feria de emprendedores');
  await ana.getByRole('button', { name: 'Reabrir convocatoria' }).click();
  await expect(ana.getByText('Convocatoria reabierta exitosamente.')).toBeVisible();
  await expect(ana.getByRole('button', { name: 'Cerrar convocatoria' })).toBeVisible();

  const luis = await abrirSesion(USUARIOS.luis);
  await abrirActividad(luis, 'Feria de emprendedores');
  await expect(luis.getByRole('button', { name: 'Solicitar participar' })).toBeVisible();
});
