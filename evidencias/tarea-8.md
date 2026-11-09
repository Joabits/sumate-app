# Tarea 8: horas de voluntariado y constancia

Integrantes: Daniel Joaquin Mamani Pena y Faryd Lucas Soliz Marquez  
Proyecto: Súmate, caso Voluntariado Cerca  
Fork: https://github.com/Joabits/sumate-app  
Commit de la funcionalidad: [174a048 feat: horas de voluntariado por jornada y constancia imprimible](https://github.com/Joabits/sumate-app/commit/174a048)  
Commit previo de organización: [4b73a24 refactor: organizar el backend en MVC y el cliente en React con Vite](https://github.com/Joabits/sumate-app/commit/4b73a24), sobre el que se construye la funcionalidad

## Funcionalidad

Requisito: la organización registra horas por jornada para los participantes aceptados de una actividad terminada. El estudiante acepta o reclama con motivo; una corrección requiere nueva aceptación. El total y la constancia imprimible incluyen solo horas confirmadas.  
Escenario: la Jornada de reforestación en el Tunari terminó hace tres días, con Luis y Sofía aceptados. Ana, la organizadora, registra dos jornadas. Luis acepta la primera (4 h) y reclama la segunda (3 h) porque se quedó hasta las 18:00. Ana corrige a 5 h, Luis acepta y su constancia muestra 9 h. Sofía no respondió, así que su constancia no tiene horas.

Cada registro de horas pasa por estos estados:

```
pendiente ──aceptar──▶ confirmada        (solo estas suman al total y a la constancia)
    │  ▲
reclamar  corregir
    ▼  │
 reclamada
```

## Decisiones

Un registro por persona y jornada: cada fila es «Luis, 7 de noviembre, 4 h». Así el voluntario responde jornada por jornada y un reclamo no bloquea las otras. La base no permite dos registros de la misma persona en la misma jornada (`uq_registro_horas_jornada`).  
Cuándo se registra: solo cuando la actividad ya terminó, no está cancelada y la fecha va desde el día de la actividad hasta hoy, en hora de Bolivia. Las horas van de más de 0 a 24.  
Quién: solo la organizadora registra y corrige, y solo para participantes aceptados. Solo el voluntario acepta o reclama sus propias horas. Cada uno ve lo suyo: la organizadora ve a todos y el voluntario solo sus registros.  
Reclamo: sin motivo no se envía, hasta 500 caracteres. El motivo queda guardado y la organizadora lo ve junto al registro.  
Corrección: guarda las horas anteriores para mostrar «3 h → 5 h corregidas» y deja el registro otra vez pendiente. No suma hasta que el voluntario vuelva a aceptar. Las horas confirmadas ya no se pueden corregir.  
Total y constancia: se calculan solo con registros confirmados. Lo pendiente o reclamado no aparece.  
Constancia imprimible: es una página propia (`/constancia`) sin menú. El botón Imprimir usa la impresión del navegador y los estilos `print:` ocultan los botones y bordes.  
Al mismo tiempo: registrar una jornada bloquea la actividad con `FOR UPDATE`, así dos registros de la misma jornada no se cruzan.

## Archivos afectados

| Parte | Cambio | Archivo |
|---|---|---|
| Datos | Tabla `registros_horas` con estado, motivo del reclamo y horas anteriores | [migración](../server/alembic/versions/e7a2c9d4b1f6_horas_de_voluntariado.py#L25) |
| Modelo | Registro, estados y reglas: registrar, aceptar, reclamar, corregir, total | [registro_horas.py](../server/app/models/registro_horas.py#L63) |
| Modelo | Errores con mensaje para cada regla | [exceptions.py](../server/app/models/exceptions.py#L163) |
| Controlador | `GET /api/horas/actividades/{id}`, `POST .../jornadas`, `PATCH /api/horas/{id}`, `POST /api/horas/{id}/aceptar`, `POST /api/horas/{id}/reclamar`, `GET /api/horas/constancia` | [horas_controller.py](../server/app/controllers/horas_controller.py#L25) |
| Vista | Respuesta de la sección de horas y de la constancia | [horas_view.py](../server/app/views/horas_view.py#L100) |
| API cliente | Llamadas, validación de la respuesta y acciones | [horasApi.ts](../client/src/api/horasApi.ts), [horasSchemas.ts](../client/src/api/schemas/horasSchemas.ts), [HorasProvider.tsx](../client/src/horas/context/HorasProvider.tsx) |
| Pantalla | Sección Horas de voluntariado en el detalle de la actividad | [HorasActividadSection.tsx](../client/src/horas/components/HorasActividadSection.tsx), [ActivityDetailView.tsx](../client/src/activities/components/ActivityDetailView.tsx#L98) |
| Pantalla | Organizadora: registrar jornada, ver reclamos y corregir | [RegistrarJornadaForm.tsx](../client/src/horas/components/RegistrarJornadaForm.tsx), [HorasOrganizador.tsx](../client/src/horas/components/HorasOrganizador.tsx), [CorregirHorasDialog.tsx](../client/src/horas/components/CorregirHorasDialog.tsx) |
| Pantalla | Voluntario: aceptar o reclamar con motivo | [MisHoras.tsx](../client/src/horas/components/MisHoras.tsx), [ReclamarHorasDialog.tsx](../client/src/horas/components/ReclamarHorasDialog.tsx) |
| Pantalla | Constancia imprimible y acceso desde el menú del perfil | [ConstanciaPage.tsx](../client/src/horas/pages/ConstanciaPage.tsx), [AppRoutes.tsx](../client/src/routers/AppRoutes.tsx#L53), [AppHeader.tsx](../client/src/shared/components/AppHeader.tsx#L141) |
| Semilla | Actividad terminada con Luis y Sofía aceptados | [seed_pruebas.py](../server/scripts/seed_pruebas.py#L41) |
| Pruebas | E2E del escenario y 5 pruebas del backend | [horas-y-constancia.spec.ts](../client/tests/horas-y-constancia.spec.ts), [test_horas_controller.py](../server/tests/controllers/test_horas_controller.py) |

## Pruebas

Con la app levantada (`docker compose up -d --build`), desde la raíz del repositorio:

```bash
# Backend (base SQLite en memoria)
cd server
python -m venv venv
venv\Scripts\pip install -r requirements.txt   # en Windows quitar uvloop, ver abajo
venv\Scripts\python -m pytest

# E2E (Playwright carga la semilla antes de correr)
cd ../client
pnpm install
$env:DATABASE_URL="postgresql://sumate:sumate@localhost:5432/sumate"   # PowerShell
pnpm exec playwright test
```

| Prueba | Qué comprueba | Resultado |
|---|---|---|
| E2E | [Dos jornadas, reclamo, corrección y confirmación: el total y la constancia solo cuentan horas confirmadas](../client/tests/horas-y-constancia.spec.ts#L13) | Pasa |
| Backend | [El mismo escenario completo](../server/tests/controllers/test_horas_controller.py#L70), [cada uno ve lo suyo](../server/tests/controllers/test_horas_controller.py#L118), [solo actividades terminadas y del organizador](../server/tests/controllers/test_horas_controller.py#L132), [validaciones al registrar](../server/tests/controllers/test_horas_controller.py#L145) y [reglas al responder y corregir](../server/tests/controllers/test_horas_controller.py#L164) | 5 de 5 |
| Suite E2E completa | Las 31 pruebas de las tareas anteriores más la nueva, desde la semilla | 32 de 32 en 1,1 min |
| Backend completo | `venv\Scripts\python -m pytest` | 126 de 126 |

![](tarea-8/reporte-suite.png)

### Fallos pendientes

No quedan pruebas fallando. Hay dos detalles anotados:

- `uvloop` está en `requirements.txt` pero no se instala en Windows («uvloop does not support Windows»). En Docker (Linux) se instala bien. En Windows instalamos todo lo demás y las pruebas pasan, porque uvloop solo acelera a uvicorn.
- pytest muestra 15 avisos de Pydantic por usar `Field(env=...)` en `app/core/config.py`. Es una forma antigua de declarar variables de entorno, sigue funcionando y la cambiaremos aparte.

## Evidencia

Las capturas salen del mismo flujo que la prueba E2E.

Ana registra la primera jornada: 4 h para Luis y 4 h para Sofía.

![](tarea-8/1-ana-registra-jornada.png)

Después registra la segunda: 3 h para Luis. Las dos jornadas quedan pendientes.

![](tarea-8/2-dos-jornadas-registradas.png)

Luis ve sus dos jornadas pendientes y su total confirmado en 0 h:

![](tarea-8/3-luis-ve-sus-horas-pendientes.png)

Acepta la primera y reclama la segunda. Sin motivo no se envía y se le dice qué falta:

![](tarea-8/4-reclamo-sin-motivo.png)

Escribe el motivo:

![](tarea-8/5-reclamo-con-motivo.png)

Queda una confirmada (4 h) y una reclamada. El total confirmado es 4 h:

![](tarea-8/6-una-confirmada-y-una-reclamada.png)

Ana ve el aviso «Hay 1 reclamo» y el motivo de Luis:

![](tarea-8/7-ana-ve-el-reclamo.png)

Ana corrige a 5 h:

![](tarea-8/8-ana-corrige.png)

La corrección vuelve a pendiente: Luis ve «3 h → 5 h corregidas» y su total sigue en 4 h hasta que acepte:

![](tarea-8/9-correccion-pendiente-de-aceptar.png)

Luis acepta y su total confirmado pasa a 9 h:

![](tarea-8/10-total-confirmado-9h.png)

Su constancia muestra las dos jornadas confirmadas y 9 h en total:

![](tarea-8/11-constancia.png)

Así se ve al imprimir, sin botones:

![](tarea-8/12-constancia-impresion.png)

Sofía no respondió sus horas: su constancia dice que todavía no tiene horas confirmadas.

![](tarea-8/13-sofia-sin-horas-confirmadas.png)
