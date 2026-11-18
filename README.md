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

### E2E con Playwright

Semilla de las pruebas: un solo comando dentro de `server`, con la base ya migrada (`alembic upgrade head`). Carga las causas, crea los usuarios de prueba si faltan y deja sus actividades como al principio. No toca a otros usuarios.

```
python scripts/seed_pruebas.py
```

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

### Sin colores fijos

```
cd client && pnpm tokens:check
```

Falla si una pantalla escribe un color a mano en vez de usar un token.

---

## 🎨 Sistema de diseño y accesibilidad

* [Sistema de diseño](docs/sistema-de-diseno.md): tokens con los nombres de Figma ([tokens.css](client/src/styles/tokens.css)) y la tabla componente ↔ archivo.
* [Reporte de accesibilidad](reportes/accesibilidad.md): Lighthouse en 10 pantallas (100), lo que se corrigió y el contraste AA de cada par de tokens.

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
