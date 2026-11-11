# 🤝 Súmate App

## 📌 Información del Proyecto

* **Materia:** Interacción Hombre-Computadora (IHC)
* **Tipo de Proyecto:** Sistema Web
* **Modalidad:** Individual
* **Alumno:** Santos Castro Roberto Anjel

---

## 📝 Descripción del Proyecto

**Súmate App** es una plataforma web diseñada para conectar estudiantes universitarios y voluntarios con causas sociales, actividades comunitarias y convocatorias de voluntariado.

La plataforma permite a los usuarios:
* 🔍 **Buscar y explorar convocatorias** filtrando por palabras clave, organización, causa social (medio ambiente, educación, salud, bienestar animal, etc.), modalidad (presencial/virtual) y rango de fechas.
* 📍 **Búsqueda por cercanía y ubicación:** Encontrar actividades cercanas calculando la distancia en kilómetros según la zona y ubicación geográfica del voluntario.
* 👥 **Inscripción y cupos en tiempo real:** Unirse a convocatorias con disponibilidad inmediata y control de aforo.
* 📅 **Gestión y seguimiento:** Publicar y gestionar actividades, consultar historial de participaciones y estado de convocatorias.

El objetivo principal es reducir las barreras de participación juvenil en causas comunitarias y facilitar que las organizaciones y estudiantes encuentren iniciativas donde realmente puedan colaborar y generar impacto.

---

## 💻 Tecnologías y Stack

* **Frontend:** React + Vite + React Router (TypeScript, Tailwind CSS); Better Auth en un servidor Node
* **Backend:** FastAPI en capas entity, repository, service y controller (Python, SQLModel, PostgreSQL)

---

## Datos de prueba y pruebas E2E

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

Pruebas E2E con Playwright, dentro de `client` y con la app levantada. Antes de cada corrida Playwright carga la semilla solo, por eso las pruebas pasan desde cero todas las veces:

```
pnpm exec playwright test
pnpm exec playwright test --headed
pnpm exec playwright test --ui
```

La matriz de pruebas y los resultados antes y después de la lista de espera están en [docs/evidencias/tarea-6.md](docs/evidencias/tarea-6.md).
