# Sistema de diseño de Súmate

Los colores y el radio de los controles se escriben una sola vez, en [client/src/styles/tokens.css](../client/src/styles/tokens.css), con nombres por uso (no por apariencia). Son los mismos nombres que las Variables de Figma, con dos modos: Claro y Oscuro.

Tailwind crea una utilidad por cada token: `--color-accion` se usa como `bg-accion`, `text-accion`, `border-accion` o `ring-accion/20`. Ningún componente escribe un valor (`#6355de`, `bg-slate-100`, `text-rose-700`).

**Comprobación automática:** `pnpm tokens:check` (dentro de `client`) falla si aparece un color escrito a mano. Corre en GitHub Actions en cada push, en el job «Sin colores fijos (tokens)». Antes del cambio encontraba 1104 colores fijos en 75 archivos; ahora encuentra 0.

## Tokens

Los cinco primeros son los de la [Clase 23](../evidencias/clase-23.md). El resto salió del inventario: cada color que se repetía con otro tono para el mismo uso quedó en un solo token. Por ejemplo, ocho morados distintos para el *hover* del botón principal (`#5244cc`, `#5446cc`, `#4f43c4`...) quedaron en `accion-hover`.

| Token | Claro | Oscuro | Dónde se usa |
|---|---|---|---|
| `color-accion` | `#6355de` | `#a9a2ed` | Acción principal: Iniciar sesión, Crear actividad, Solicitar participar, Publicar, Registrar jornada, Descargar mis datos; enlaces y selección |
| `color-accion-hover` | `#5244cc` | `#bdb7f2` | Hover y presionado de la acción principal |
| `color-accion-suave` | `#f3f1fd` | `#26224a` | Fondo de chips seleccionados, íconos destacados y botones secundarios de la acción |
| `color-accion-suave-hover` | `#e5e0fd` | `#322c5e` | Hover de lo anterior |
| `color-accion-borde` | `#ddd8fc` | `#4a4380` | Borde de los elementos con fondo `accion-suave` |
| `color-sobre-accion` | `#ffffff` | `#0f172b` | Texto e íconos encima de un color lleno (botón principal, peligro, insignias) |
| `color-texto` | `#0f172b` | `#f1f5f9` | Títulos y texto principal |
| `color-texto-secundario` | `#45556c` | `#cad5e2` | Texto de apoyo y etiquetas |
| `color-texto-tenue` | `#5e7089` | `#9fafc4` | Ayudas, fechas, placeholders e íconos. Cumple AA sobre `fondo` y sobre `superficie-alta` (4,61:1) |
| `color-texto-deshabilitado` | `#cad5e2` | `#45556c` | Controles deshabilitados y separadores de texto |
| `color-fondo` | `#ffffff` | `#0f172b` | Fondo de pantallas, tarjetas y diálogos |
| `color-superficie` | `#f8fafc` | `#1d293d` | Bloques sobre el fondo (secciones, listas) |
| `color-superficie-alta` | `#f1f5f9` | `#314158` | Campos, chips sin seleccionar y botones secundarios |
| `color-superficie-hover` | `#e2e8f0` | `#45556c` | Hover de superficies y botones secundarios |
| `color-velo` | `#000000` | `#000000` | Fondo oscurecido detrás de diálogos y hojas |
| `color-borde-suave` | `#f1f5f9` | `#1d293d` | Separadores y bordes de tarjetas |
| `color-borde` | `#e2e8f0` | `#314158` | Bordes de campos y botones |
| `color-borde-fuerte` | `#cad5e2` | `#45556c` | Bordes con énfasis (hover de campos) |
| `color-error` | `#ec003f` | `#ff637e` | Acciones peligrosas: Retirarme, Cerrar o Cancelar actividad, Eliminar cuenta |
| `color-error-fuerte` | `#c70036` | `#ffa1ad` | Mensajes de error y estado Rechazada |
| `color-error-suave` / `-borde` | `#fff1f2` / `#ffccd3` | `#4d0218` / `#8b0836` | Fondo y borde de avisos de error |
| `color-exito` / `-fuerte` | `#009966` / `#007a55` | `#00d492` / `#5ee9b5` | Estados Aceptada y Confirmada |
| `color-exito-suave` / `-borde` | `#ecfdf5` / `#a4f4cf` | `#002c22` / `#004f3b` | Fondo y borde de esas insignias |
| `color-aviso` / `-fuerte` | `#e17100` / `#bb4d00` | `#ffb900` / `#ffd230` | Estados Pendiente y En espera |
| `color-aviso-suave` / `-borde` | `#fffbeb` / `#fee685` | `#461901` / `#7b3306` | Fondo y borde de esas insignias |
| `color-info` / `-fuerte` | `#0084d1` / `#0069a8` | `#00bcff` / `#74d4ff` | Avisos informativos (actividad cancelada, constancia) |
| `color-info-suave` / `-borde` | `#f0f9ff` / `#b8e6fe` | `#052f4a` / `#024a70` | Fondo y borde de esos avisos |
| `radio-control` | `12px` | `12px` | Radio de los botones de los diálogos de confirmación (postular, retirarse, eliminar la cuenta) y del campo del motivo (`rounded-control`). Los botones píldora de Login, Registro y Explorar todavía no lo usan |

El tema oscuro tiene sus valores en `[data-tema="oscuro"]`; la app todavía se muestra solo en claro.

## Componentes ↔ archivos

Los diez componentes del sistema en Figma y dónde está cada uno en el código.

| Componente (Figma) | Variantes y estados | Archivo | Tokens que usa |
|---|---|---|---|
| Botón principal | Normal, hover, foco, deshabilitado, cargando | [PrimaryButton.tsx](../client/src/shared/components/PrimaryButton.tsx), [SubmitButton.tsx](../client/src/shared/components/SubmitButton.tsx) (cargando) | `accion`, `accion-hover`, `sobre-accion` |
| Botón secundario y de peligro | Secundario, peligro; normal, hover, deshabilitado | [AppAlertDialog.tsx](../client/src/shared/components/AppAlertDialog.tsx) | `superficie-alta`, `superficie-hover`, `error`, `error-fuerte`, `error-suave` |
| Campo de texto | Normal, foco, error, deshabilitado | [TextFormField.tsx](../client/src/shared/components/TextFormField.tsx) | `fondo`, `borde`, `accion`, `texto`, `texto-tenue` |
| Tarjeta de actividad | Abierta, llena, cancelada, pasada | [ActivityCard.tsx](../client/src/activities/components/ActivityCard.tsx), [ActivityCardShell.tsx](../client/src/activities/components/ActivityCardShell.tsx) | `superficie-alta`, `borde-suave`, `texto`, `accion` y los de estado |
| Insignia de estado | Pendiente, aceptada, en espera, rechazada, confirmada | [EstadoHorasBadge.tsx](../client/src/horas/components/EstadoHorasBadge.tsx) | `aviso-*`, `exito-*`, `error-*` |
| Diálogo de confirmación | Normal, peligro, enviando | [AppAlertDialog.tsx](../client/src/shared/components/AppAlertDialog.tsx) | `fondo`, `velo`, `texto`, `accion`, `error` |
| Hoja inferior | Abierta, con pie fijo | [AppSheet.tsx](../client/src/shared/components/AppSheet.tsx) | `fondo`, `borde-suave`, `texto`, `texto-tenue` |
| Encabezado | Móvil, escritorio, con menú abierto | [AppHeader.tsx](../client/src/shared/components/AppHeader.tsx) | `fondo`, `superficie`, `texto`, `accion-suave` |
| Navegación | Barra inferior (móvil) y lateral (escritorio); activo, inactivo | [AppNavbar.tsx](../client/src/shared/components/AppNavbar.tsx), [DesktopSidebar.tsx](../client/src/shared/components/DesktopSidebar.tsx) | `fondo`, `superficie-alta`, `texto`, `texto-secundario` |
| Aviso (toast) | Éxito, error, información, advertencia | [Toast.tsx](../client/src/shared/components/Toast.tsx) | `fondo`, `texto`, `exito`, `error`, `accion`, `aviso` |

## Excepciones

- **Logo de Google** en [SocialSignInButtons.tsx](../client/src/auth/components/SocialSignInButtons.tsx): sus cuatro colores son de la marca y no cambian con el tema. Están permitidos en `pnpm tokens:check`.
- **Avisos de sileo y pin del mapa:** reciben el color como atributo o HTML, así que leen el token en tiempo de ejecución con `leerToken("--color-fondo")` ([tokens.ts](../client/src/shared/lib/tokens.ts)) o con `var(--color-accion)`.
- **Máscara de la portada** en la bienvenida: `black` y `transparent` definen la transparencia del degradado, no un color que se vea.
