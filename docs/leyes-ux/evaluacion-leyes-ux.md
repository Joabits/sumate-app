# 📐 Evaluación de Leyes y Principios de UX (IHC)

## 📌 Información General
* **Materia:** Interacción Hombre-Computadora (IHC)
* **Proyecto:** Súmate App
* **Alumno:** Santos Castro Roberto Anjel
* **Flujos Evaluados:** Detalle de Actividad (`/activities/[id]`), Búsqueda y Filtros (`/activities/search`), Creación de Actividades (`/my-activities`) y Exploración (`/explore`).
* **Principios Evaluados:** Ley de Fitts, Ley de Hick y Carga Cognitiva.

---

## 📊 Matriz de Evaluación de Leyes de UX

| Hallazgo | Captura (esta la agrego luego) | Justificacion breve | Estado al terminar |
| :--- | :---: | :--- | :---: |
| **1. Ley de Fitts**<br>Dimensiones y ubicación de acciones críticas en Detalle de Actividad (`/activities/[id]`) y Crear actividad (`/my-activities`): Botones flotantes inferiores arrinconados a la derecha (`fixed bottom-6 right-5`), y acciones superiores en el header (*Compartir*, *Editar*, *Eliminar*). | ![Fitts 1](../fotos-nuevas/hick1.png) ![Fitts 2](../fotos-nuevas/hick2.png) ![Fitts 3](../fotos-nuevas/hick3.png) | Según la Ley de Fitts ($MT = a + b \log_2(2D/W)$), el tiempo para alcanzar un objetivo depende de la distancia ($D$) y del ancho ($W$) del blanco. Los botones flotantes periféricos tienen un ancho reducido (~140px) y una posición que dificulta el alcance ergonómico del pulgar (fuera de la zona natural de confort o Thumb Zone). En el header superior, los botones de acción son pequeños y requieren alta precisión. | **Requiere mejora**<br>*(En proceso / Identificado con propuesta de mejora)* |
| **2. Ley de Hick**<br>Sobrecarga de opciones simultáneas e inmediatas al desplegar el panel de filtros de búsqueda (`/activities/search`). | ![Hick Antes](../fotos-nuevas/fitts.png) ![Hick Después](../fotos-nuevas/mejora-filtro.png) | Conforme a la Ley de Hick ($T = b \log_2(n+1)$), el tiempo de decisión se incrementa logarítmicamente con el número de alternativas visibles. Inicialmente el panel mostraba 5 secciones abiertas en simultáneo (más de 15 chips y controles). Se solucionó jerarquizando las secciones en bloques colapsables: se dejan abiertas por defecto solo las 2 primarias (*Hora del día* y *Fecha*), se colapsa *Causas* y se agrupan los filtros secundarios (*Distancia* y *Asistentes*) en *"Más filtros"*. | **Requiere implementación**<br>*(Implementado y corregido con código)* |
| **3. Carga Cognitiva**<br>Flujo de creación progresiva de actividades: Creación rápida inicial y posterior enriquecimiento guiado en la pantalla de detalle (`/activities/[id]`) para el organizador (*owner*). | ![Cogni 1](../fotos-nuevas/cogni1.png) ![Cogni 2](../fotos-nuevas/cogni2.png) | Para evitar la sobrecarga cognitiva intrínseca de completar un formulario masivo de 15 campos en un solo paso, el sistema divide la carga mental (*Chunking* de Sweller): primero solicita los datos indispensables (nombre, fecha, cupos, imagen) y permite al *owner* definir progresivamente detalles complementarios en la vista de detalle. Para reducir la carga extraneous, la interfaz guía activamente al creador indicando *"Causas por definir"* y *"Ubicación por definir"* junto con la instrucción contextual *"Activa el modo de edición"*. | **Cumple con la regla**<br>*(Cumple por diseño arquitectónico)* |

> [!NOTE]
> **Aclaración sobre los estados de la evaluación:**
> 1. **Filtros (Ley de Hick):** **SÍ requirió implementación activa en código**. Se implementó la lógica de secciones colapsables, persistencia al limpiar filtros y agrupación secundaria en `activity-search-filters-sheet.tsx`.
> 2. **Detalle y Acciones (Ley de Fitts):** **Requiere una mejora técnica**. Se diagnosticó la necesidad de sustituir los botones flotantes aislados de la esquina por una *Sticky Bottom Bar* de ancho completo para optimizar el área táctil y la distancia ergonómica.
> 3. **Flujo de Creación (Carga Cognitiva):** **Ya CUMPLE con la regla**. El sistema fue concebido arquitectónicamente bajo el principio de división de carga cognitiva (creación ágil inicial en sheet y enriquecimiento posterior por demanda en la pantalla de detalle con guías visuales).

---

## 📸 Evidencia Visual (Capturas de Pantalla)

### 1. Ley de Fitts: Botones Flotantes Periféricos y Header Superior

Los botones de acción clave en la pantalla de detalle (`Reabrir convocatoria`, `Cerrar convocatoria`) y en la pantalla de Mis actividades (`+ Crear actividad`) se encuentran posicionados como botones flotantes arrinconados a la derecha (`fixed bottom-6 right-5`). Asimismo, en la parte superior del detalle se agrupan los iconos de *Compartir*, *Editar* y *Eliminar*.

| Detalle: Botón flotante inferior (Cerrada) | Mis Actividades: Botón flotante Crear | Detalle: Botón flotante inferior (Abierta) |
| :---: | :---: | :---: |
| ![Reabrir Convocatoria](../fotos-nuevas/hick1.png) | ![Crear Actividad](../fotos-nuevas/hick2.png) | ![Cerrar Convocatoria](../fotos-nuevas/hick3.png) |

* **Diagnóstico bajo Fitts:** La distancia $D$ desde el centro de la pantalla o desde la mano izquierda hasta la esquina inferior derecha es mayor a la deseable, y el ancho $W$ (~140px) exige precisión en pantallas móviles. En el header superior, los iconos de 32x32px demandan puntería fina.
* **Propuesta de Mejora:** Reemplazar el botón flotante por una **Sticky Bottom Action Bar** fija en el borde inferior con botón de ancho completo (`w-full`), maximizando $W$ y minimizando $D$ en la *Thumb Zone*.

---

### 2. Ley de Hick: Panel de Filtros de Búsqueda (Antes vs Después)

El panel de filtros en `/activities/search` presentaba múltiples dimensiones de filtrado abiertas en simultáneo (*Hora del día*, *Fecha*, *Causas temáticas*, *Distancia* y *Tamaño de asistentes*).

| Antes (Todas las opciones abiertas y sobrecarga cognitiva) | Después (Secciones colapsables y agrupación "Más filtros") |
| :---: | :---: |
| ![Filtros Antes](../fotos-nuevas/fitts.png) | ![Filtros Después](../fotos-nuevas/mejora-filtro.png) |

* **Diagnóstico bajo Hick:** Al abrir el panel con todas las opciones simultáneamente visibles, la cantidad de estímulos incrementa el tiempo de reacción $T = b \log_2(n+1)$ y abruma al voluntario.
* **Solución Implementada:** Se implementaron secciones colapsables (solo *Hora* y *Fecha* desplegadas por defecto, *Causas* colapsada) y se unificaron *Distancia* y *Asistentes* dentro de una sola sección colapsable denominada **"Más filtros"**.

---

### 3. Carga Cognitiva: Creación Progresiva y Guías en Detalle

El proceso de creación de una actividad no fuerza al usuario a completar decenas de campos de golpe.

| Paso 1: Creación ágil (Datos básicos) | Paso 2: Enriquecimiento progresivo en Detalle |
| :---: | :---: |
| ![Creación ágil](../fotos-nuevas/cogni1.png) | ![Enriquecimiento en Detalle](../fotos-nuevas/cogni2.png) |

* **Fase 1 (Creación rápida):** El modal de creación (`CreateActivitySheet` en `cogni1.png`) solicita únicamente los datos indispensables para dar de alta el evento: título, fecha, aforo e imagen.
* **Fase 2 (Enriquecimiento en Detalle):** Una vez creada la actividad, el creador (*owner*) accede al detalle (`cogni2.png`) para completar la información secundaria (ubicación en mapa, causas temáticas y descripción).
* **Guía activa en la interfaz:** Para evitar incertidumbre en el creador, la vista de detalle señala claramente qué datos están pendientes de configuración:
  - *Ubicación:* Muestra `"Ubicación por definir"` y el texto de acción `"Activa el modo de edición"`.
  - *Causas temáticas:* Muestra `"Causas por definir"` y el texto de acción `"Activa el modo de edición"` / `"Toca para seleccionar causas"`.
  - *Descripción:* Muestra `"Aún no has agregado una descripción. Activa el modo edición para redactarla."`

---

## 🔬 Detalle Teórico y Técnico por Principio

### 1. Ley de Fitts
* **Fórmula:**
  $$MT = a + b \cdot \log_2\left(\frac{2D}{W}\right)$$
* **Diagnóstico en Súmate App:**
  - El botón flotante inferior en `/activities/[id]` mide ~140px de ancho y está anclado en `fixed bottom-6 right-5`. En dispositivos móviles medianos y grandes, el pulgar debe forzar el movimiento diagonal hacia la esquina. En escritorio o tablet, el botón se separa del contenedor centrado de la app (`max-w-md`), incrementando la distancia $D$ drásticamente.
  - En la cabecera (`ActivityDetailHeader`), los botones de *Compartir*, *Editar* y *Eliminar* están agrupados en la barra superior (`w-8 h-8`), demandando precisión de puntero.
* **Oportunidad de Mejora:**
  - Integrar una **Sticky Bottom Action Bar** anclada al ancho del contenedor móvil con botón de ancho completo (`w-full`), maximizando $W$ y colocando la acción principal en la zona de menor distancia $D$ y menor tasa de error de pulsación.

---

### 2. Ley de Hick
* **Fórmula:**
  $$T = b \cdot \log_2(n + 1)$$
* **Diagnóstico en Súmate App:**
  - Al abrir el panel de filtros en `/activities/search`, el voluntario se encontraba con 5 bloques de decisión abiertos a la vez: *Hora del día*, *Fecha*, *Causas*, *Distancia* y *Tamaño de asistentes*.
* **Solución Implementada:**
  - **Secciones colapsables independientes:** Reducción del estímulo inicial visual a 2 categorías primarias (Hora y Fecha).
  - **Agrupación contextual:** Fusión de distancia y aforo en la sección *"Más filtros"*.
  - **Reseteo no destructivo:** "Limpiar todo" restablece los valores seleccionados sin cerrar las secciones que el usuario ya abrió, respetando su exploración.

---

### 3. Carga Cognitiva
* **Fundamento:** La memoria de trabajo humana tiene capacidad limitada (Teoría de la Carga Cognitiva de Sweller). Exigir toda la configuración de un evento en una sola pantalla satura la capacidad atencional del voluntario u organizador.
* **Diagnóstico en Súmate App:**
  - Si un usuario tuviera que definir mapa exacto, geolocalización por coordenadas, etiquetas de causas, descripción detallada y aforo en un solo formulario inicial, la tasa de abandono sería alta.
* **Solución y Comprobación en la Arquitectura:**
  - **División en etapas (Chunking):** Creación ágil en el Bottom Sheet inicial (`CreateActivitySheet`) y refinamiento posterior en el Detalle (`ActivityDetailView`).
  - **Señalización explícita para el creador (*owner*):** Si faltan datos complementarios, la vista de detalle muestra placeholders activos de acción (*"Ubicación por definir"*, *"Causas por definir"*, *"Activa el modo de edición"*).
