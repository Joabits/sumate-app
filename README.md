# 🤝 Súmate App

[![pruebas](https://github.com/Joabits/sumate-app/actions/workflows/pruebas.yml/badge.svg?branch=main)](https://github.com/Joabits/sumate-app/actions/workflows/pruebas.yml)

Última ejecución de las pruebas: [GitHub Actions › pruebas](https://github.com/Joabits/sumate-app/actions/workflows/pruebas.yml?query=branch%3Amain)

## 📌 Información del Proyecto

* **Materia:** Interacción Hombre-Computadora (IHC) · 2026-2
* **Tipo de Proyecto:** Sistema Web
* **Proyecto 2 (fork):** Daniel Joaquin Mamani Pena y Faryd Lucas Soliz Marquez
* **Proyecto recibido:** Santos Castro Roberto Anjel (hasta el commit `1fcbb48`)

---

## 📝 Descripción del Proyecto

**Súmate App** es una plataforma web diseñada para conectar estudiantes universitarios y voluntarios con causas sociales, actividades comunitarias y convocatorias de voluntariado.

La plataforma permite a los usuarios:
* 🔍 **Buscar y explorar convocatorias** filtrando por palabras clave, organización, causa social (medio ambiente, educación, salud, bienestar animal, etc.), modalidad (presencial/virtual) y rango de fechas.
* 📍 **Búsqueda por cercanía y ubicación:** Encontrar actividades cercanas calculando la distancia en kilómetros según la zona y ubicación geográfica del voluntario. La ubicación se pide solo al usar el filtro de distancia.
* 👥 **Inscripción y cupos en tiempo real:** Unirse a convocatorias con disponibilidad inmediata, control de aforo y lista de espera.
* 📅 **Gestión y seguimiento:** Publicar y gestionar actividades, consultar historial de participaciones, registrar horas y descargar la constancia.
* 🔐 **Mis datos:** Ver y descargar los datos propios y eliminar la cuenta con la regla de la app.

El objetivo principal es reducir las barreras de participación juvenil en causas comunitarias y facilitar que las organizaciones y estudiantes encuentren iniciativas donde realmente puedan colaborar y generar impacto.

---

## 💻 Tecnologías y Stack

* **Frontend:** React + Vite + React Router (TypeScript, Tailwind CSS); Better Auth en un servidor Node
* **Backend:** FastAPI en capas entity, repository, service y controller (Python, SQLModel, PostgreSQL)
* **Pruebas:** pytest con cobertura y diff-cover (backend), Playwright con axe (E2E y accesibilidad)

---

## ☁️ App desplegada

Súmate corre en Google Cloud Run, con PostgreSQL en Cloud SQL cargada con las semillas de prueba (seed_pruebas.py) y de demostración (seed_presentacion.py).

| Servicio | Enlace |
|---|---|
| Web | https://sumate-web-96840086064.us-central1.run.app |
| API (documentación) | https://sumate-api-96840086064.us-central1.run.app/docs |

Usuarios para probar: ana@sumate.dev (organizadora) y maria@sumate.dev (voluntaria), con la contraseña de la sección de pruebas. La imagen de la web se arma con [client/Dockerfile.cloudrun](client/Dockerfile.cloudrun).

---

## ▶️ Levantar la app

Con Docker Desktop abierto, en la raíz del repositorio:

```
docker compose up -d --build
```

Frontend en http://localhost:3000 y API en http://localhost:8001/docs. La primera vez carga las causas y datos de demostración.

---

## 🧪 Pruebas

Las tres corren solas en cada push en GitHub Actions ([.github/workflows/pruebas.yml](.github/workflows/pruebas.yml)).

### Unitarias del backend y cobertura

Dentro de `server`, con un entorno de Python 3.12:

```
pip install -r requirements-dev.txt
python -m pytest --cov --cov-report=xml --cov-report=term
diff-cover coverage.xml --compare-branch=1fcbb48 --html-report ../reportes/cobertura-backend.html
```

| Qué se mide | Cobertura |
|---|---|
| Líneas del backend agregadas en el fork (diff-cover contra `1fcbb48`) | **100 %** (1903 de 1903) |
| Todo el backend (`server/app`) | **96 %** |

El reporte está en [reportes/cobertura-backend.html](reportes/cobertura-backend.html) ([versión Markdown](reportes/cobertura-backend.md)). CI falla si las líneas del fork bajan del 100 %.

**Qué queda sin probar** (no es código del fork): la validación del JWT de Better Auth contra el JWKS ([security.py](server/app/core/security.py), 46 %; se prueba de punta a punta con las E2E) y la geocodificación con un servicio externo ([geocoding.py](server/app/core/geocoding.py)). Las semillas (`server/scripts/seed_*.py`) son datos de prueba: corren en cada E2E y no se miden.

### Cobertura del frontend (con las E2E)

El frontend no tiene pruebas unitarias: su cobertura se mide con las E2E. Con `COBERTURA=1` Vite instrumenta `client/src` y cada página manda al servidor lo que ejecutó ([src/cobertura.ts](client/src/cobertura.ts)). Sin la variable, la app no cambia.

```
COBERTURA=1 docker compose up -d --build
cd client
DATABASE_URL=postgresql://sumate:sumate@localhost:5432/sumate pnpm exec playwright test
docker compose exec -T client npx nyc report --temp-dir .nyc_output --report-dir coverage-e2e --reporter=cobertura --reporter=text-summary
docker compose cp client:/app/coverage-e2e coverage-e2e
sed -i "s#<source>/app</source>#<source>$PWD</source>#" coverage-e2e/cobertura-coverage.xml
cd .. && diff-cover client/coverage-e2e/cobertura-coverage.xml --compare-branch=1fcbb48 --html-report reportes/cobertura-frontend.html
```

| Qué se mide | Cobertura |
|---|---|
| Líneas del frontend agregadas en el fork (diff-cover contra `1fcbb48`) | **79 %** (1012 de 1270) |
| Todo el frontend (`client/src`), líneas | **77 %** (ramas 64 %) |

Es una medida por debajo de la real: cada página manda su cobertura una vez por segundo, así que lo que ejecuta en el último segundo antes de cerrarse (por ejemplo, la redirección después de eliminar la cuenta) no siempre llega.

El reporte está en [reportes/cobertura-frontend.html](reportes/cobertura-frontend.html) ([versión Markdown](reportes/cobertura-frontend.md)). En CI se genera en cada push, en el job de E2E.

**Qué queda sin probar en el frontend:** la recuperación de errores de la API (sin conexión, sesión vencida, error 500: [useApiErrorRecovery.ts](client/src/shared/hooks/useApiErrorRecovery.ts), [apiError.ts](client/src/api/errors/apiError.ts)), los formularios de contraseña olvidada y restablecer contraseña (necesitan el correo real), el diálogo para reclamar horas ([ReclamarHorasDialog.tsx](client/src/horas/components/ReclamarHorasDialog.tsx)) y las validaciones locales de los Providers que la interfaz ya impide (por ejemplo, editar una actividad con datos vacíos).

### E2E con Playwright

Semilla de las pruebas: un solo comando dentro de `server`, con la base ya migrada (`alembic upgrade head`). Carga las causas, crea los usuarios de prueba si faltan y deja sus actividades como al principio. No toca a otros usuarios.

```
python scripts/seed_pruebas.py
```

Para la demostración, `python scripts/seed_presentacion.py` suma 42 personas más, con 34 actividades en Cochabamba, solicitudes en todos los estados, listas de espera y horas confirmadas. No toca a los usuarios de prueba y se puede volver a correr para dejar todo como al principio.

Usuarios de prueba (contraseña `Demo12345`):

| Correo | Rol en las pruebas |
|---|---|
| ana@sumate.dev | Organizadora: publica, acepta o rechaza solicitudes, cierra y reabre convocatorias |
| maria@sumate.dev | Voluntaria: busca, solicita participar y entra a una lista de espera |
| luis@sumate.dev | Voluntario: tiene el único cupo del Taller de primeros auxilios y lo cancela |
| sofia@sumate.dev | Voluntaria: primera en la lista de espera |
| carlos@sumate.dev | Voluntario: segundo en la lista de espera; Ana rechaza otra de sus solicitudes |
| nuevo@sumate.dev | Pedro: sin actividades ni solicitudes, para ver los estados vacíos |
| valeria@sumate.dev | Elimina su cuenta en la E2E de Mis datos (la semilla la vuelve a crear en cada corrida) |
| tomas@sumate.dev | En lista de espera: entra al cupo que libera Valeria al eliminar su cuenta |

Dentro de `client` y con la app levantada. Antes de cada corrida Playwright carga la semilla solo, por eso las pruebas pasan desde cero todas las veces:

```
pnpm install
DATABASE_URL=postgresql://sumate:sumate@localhost:5432/sumate pnpm exec playwright test
pnpm exec playwright test --headed
pnpm exec playwright test --ui
```

56 pruebas: flujos principales, accesibilidad con axe en 10 pantallas, patrones oscuros y capturas aprobadas de inicio de sesión y registro.

Último reporte de Playwright (56 de 56 en verde, 18/11/2026): [reportes/playwright-report/index.html](reportes/playwright-report/index.html). Se abre en el navegador. GitHub Actions también guarda el reporte de cada ejecución como artefacto (`reporte-e2e`).

### Sin colores fijos

```
cd client && pnpm tokens:check
```

Falla si una pantalla escribe un color a mano en vez de usar un token.

---

## 🎨 Sistema de diseño y accesibilidad

* [Sistema de diseño](docs/sistema-de-diseno.md): tokens con los nombres de Figma ([tokens.css](client/src/styles/tokens.css)) y la tabla componente ↔ archivo.
* [Reporte de accesibilidad](reportes/accesibilidad.md): Lighthouse (100) y WAVE (0 errores, 0 alertas, AIM 10) en 10 pantallas, lo que se corrigió y el contraste AA de cada par de tokens.

---

## 🎤 Presentación final

| Qué | Dónde |
|---|---|
| Diapositivas de la venta, con notas del orador y el video incluido | [PowerPoint](presentacion/sumate-presentacion.pptx) · [PDF](presentacion/sumate-presentacion.pdf) |
| Video de la app funcionando en un iPhone, de crear la cuenta a tener un cupo | [presentacion/video/sumate-iphone.mp4](presentacion/video/sumate-iphone.mp4) |
| Capturas de la app real en iPhone 17 Pro | [presentacion/capturas/](presentacion/capturas/) |
| Informe en formato APA 7 | [PDF](presentacion/informe-sumate.pdf) · [Word](presentacion/informe-sumate.docx) |
| Figma: variables, 10 componentes y flujos del camino feliz | [figma/](figma/README.md) · [abrir en Figma](https://www.figma.com/design/lBOMcQacMQvV3kBp98fJTM) |

---

## 📁 Evidencias

| Entrega | Evidencia |
|---|---|
| Tarea 6 · Pruebas E2E | [docs/evidencias/tarea-6.md](docs/evidencias/tarea-6.md) |
| Tarea 7 · Cancelar una oportunidad | [evidencias/tarea-7.md](evidencias/tarea-7.md) |
| Tarea 8 · Horas y constancia | [evidencias/tarea-8.md](evidencias/tarea-8.md) |
| Tarea 9 · Retirarse y analítica | [evidencias/tarea-9.md](evidencias/tarea-9.md) |
| Tarea 10 · Mis datos y salida honesta | [evidencias/tarea-10.md](evidencias/tarea-10.md) |
| Clase 20 | [evidencias/clase-20.md](evidencias/clase-20.md) |
| Clase 21 | [evidencias/clase-21.md](evidencias/clase-21.md) |
| Clase 22 · Patrones oscuros | [evidencias/clase-22.md](evidencias/clase-22.md) |
| Clase 23 · Inventario y tokens | [evidencias/clase-23.md](evidencias/clase-23.md) |
