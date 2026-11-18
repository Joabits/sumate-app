# Accesibilidad: reporte interpretado y corregido

Fecha: 18/11/2026. Herramientas: Lighthouse 12.8.2 (categoría accesibilidad, Chrome sin interfaz) y axe-core con las reglas WCAG 2.0 A y AA dentro de la suite E2E ([accesibilidad.spec.ts](../client/tests/accesibilidad.spec.ts)).

Lighthouse se corrió con la sesión iniciada (María y Ana, de la semilla), para medir las pantallas reales y no la redirección al login. Los reportes completos están en [reportes/lighthouse](lighthouse/).

## 1. Resultado

| Pantalla | Puntaje | Reporte |
|---|---|---|
| Inicio de sesión | 100 | [inicio-de-sesion.html](lighthouse/inicio-de-sesion.html) |
| Registro | 100 | [registro.html](lighthouse/registro.html) |
| Explorar | 100 | [explorar.html](lighthouse/explorar.html) |
| Buscar | 100 | [buscar.html](lighthouse/buscar.html) |
| Detalle de una actividad | 100 | [detalle-actividad.html](lighthouse/detalle-actividad.html) |
| Mi trayectoria | 100 | [mi-trayectoria.html](lighthouse/mi-trayectoria.html) |
| Constancia | 100 | [constancia.html](lighthouse/constancia.html) |
| Mis datos | 100 | [mis-datos.html](lighthouse/mis-datos.html) |
| Mis actividades | 100 | [mis-actividades.html](lighthouse/mis-actividades.html) |
| Analítica | 100 | [analitica.html](lighthouse/analitica.html) |

El 100 no significa que no hubiera nada que mejorar. Lighthouse revisa otras reglas que no suman al puntaje, y axe encontró un problema en una pantalla que antes no se revisaba. Lo que encontramos y lo que hicimos con cada cosa está a continuación.

## 2. Qué encontramos y qué corregimos

| Hallazgo | Regla | Dónde | Qué significa para la persona | Corrección |
|---|---|---|---|---|
| El botón de búsqueda del encabezado se llamaba «Buscar actividades», pero muestra «Buscar actividades por nombre, causa o lugar...» | WCAG 2.5.3 Etiqueta en el nombre (Lighthouse `label-content-name-mismatch`) | Encabezado de todas las pantallas | Quien usa control por voz dice lo que ve y el botón no responde | El nombre ahora es el texto visible ([AppHeader.tsx](../client/src/shared/components/AppHeader.tsx)) |
| «Crear nueva actividad» frente al texto visible «Crear actividad» | WCAG 2.5.3 | Explorar y Mis actividades | Igual que arriba | El nombre ahora es «Crear actividad nueva», que contiene el texto visible ([CreateActivitySheet.tsx](../client/src/activities/components/CreateActivitySheet.tsx)) |
| «Ver participantes de la actividad» frente a «3 participantes confirmados» | WCAG 2.5.3 | Detalle de una actividad | Igual que arriba | Se quitó el `aria-label`: el nombre es el contenido visible ([ActivityDetailParticipants.tsx](../client/src/activities/components/ActivityDetailParticipants.tsx)) |
| La tarjeta de actividad se nombraba con un `aria-label` copiado del título | WCAG 2.5.3 | Explorar, Buscar, Mis actividades, Mi trayectoria | Si el título cambia, el nombre puede quedar desactualizado | Ahora la tarjeta toma el nombre del título visible con `aria-labelledby` ([ActivityCardShell.tsx](../client/src/activities/components/ActivityCardShell.tsx)) |
| La zona con scroll de Analítica no se podía enfocar | WCAG 2.1.1 Teclado (axe `scrollable-region-focusable`) | Analítica | Con el teclado no se puede bajar a ver los embudos | La zona recibe el foco, tiene nombre («Analítica») y muestra un anillo de foco ([AnaliticaPage.tsx](../client/src/analitica/pages/AnaliticaPage.tsx)) |
| Texto tenue sobre superficie gris: 4,35:1 | WCAG 1.4.3 Contraste mínimo (AA, 4,5:1) | Placeholders y chips sobre `superficie-alta` | Quien ve con poco contraste no lee las ayudas de los campos | El token `color-texto-tenue` pasó de `#62748e` a `#5e7089` (4,61:1). En oscuro, de `#90a1b9` a `#9fafc4` |
| El texto tenue usaba `slate-400` en varias pantallas: 2,6:1 sobre blanco | WCAG 1.4.3 | Fechas, ayudas e íconos | Igual que arriba | Al pasar a tokens, `slate-400` y `slate-500` quedaron en `color-texto-tenue` (5,05:1) |

La suite de axe ahora revisa **10 pantallas** (antes 7): se agregaron Constancia, Mis datos y Analítica. Si alguien vuelve a introducir uno de estos problemas, la E2E falla en GitHub Actions.

## 3. Lo que revisamos y dejamos como está

| Hallazgo | Por qué se queda |
|---|---|
| Avatar del encabezado: nombre «Perfil de usuario», texto visible con las iniciales («MR») | Las iniciales son una abreviatura decorativa (tienen `aria-hidden`), no la etiqueta del botón. El nombre dice qué hace el botón |
| Tarjeta de actividad: el nombre es el título, y la tarjeta también muestra fecha, causas y cupos | El título es la etiqueta de la tarjeta. Si el nombre fuera todo el contenido, el lector de pantalla repetiría fecha, causas y cupos en cada enlace de la lista. Lighthouse marca esta regla como experimental y no la cuenta en el puntaje |

## 4. Contraste AA de los tokens

Todos los pares de texto y fondo que usa la app, calculados con la fórmula de WCAG sobre los valores de [tokens.css](../client/src/styles/tokens.css). El mínimo AA para texto normal es 4,5:1.

| Texto | Fondo | Claro | Oscuro |
|---|---|---|---|
| `texto` | `fondo` | 17,83:1 ✅ | 16,28:1 ✅ |
| `texto-secundario` | `fondo` | 7,58:1 ✅ | 12,00:1 ✅ |
| `texto-tenue` | `fondo` | 5,05:1 ✅ | 7,98:1 ✅ |
| `texto-tenue` | `superficie-alta` | 4,61:1 ✅ | 4,64:1 ✅ |
| `texto` | `superficie-alta` | 16,28:1 ✅ | 9,45:1 ✅ |
| `sobre-accion` | `accion` | 5,41:1 ✅ | 7,71:1 ✅ |
| `sobre-accion` | `accion-hover` | 6,87:1 ✅ | 9,53:1 ✅ |
| `accion` | `fondo` | 5,41:1 ✅ | 7,71:1 ✅ |
| `accion` | `accion-suave` | 4,84:1 ✅ | 6,44:1 ✅ |
| `sobre-accion` | `error` | 4,53:1 ✅ | 6,23:1 ✅ |
| `error-fuerte` | `error-suave` | 5,49:1 ✅ | 8,19:1 ✅ |
| `exito-fuerte` | `exito-suave` | 5,09:1 ✅ | 9,97:1 ✅ |
| `aviso-fuerte` | `aviso-suave` | 4,85:1 ✅ | 10,37:1 ✅ |
| `info-fuerte` | `info-suave` | 5,49:1 ✅ | 8,34:1 ✅ |
| `error-fuerte` | `fondo` | 6,03:1 ✅ | 9,30:1 ✅ |

Además, la regla `color-contrast` de Lighthouse y de axe pasa en las 10 pantallas.
