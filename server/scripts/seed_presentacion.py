"""Datos para la demostración del Proyecto 2: 42 personas más, con actividades, solicitudes y horas.

Se suma a seed_demo.py y seed_pruebas.py sin tocar a sus usuarios. Todo lo que crea lleva el
prefijo pres- y se borra y se vuelve a crear en cada corrida, así que se puede correr las veces
que haga falta para volver al estado inicial de la demostración.

Uso (dentro de server, con la base migrada y las causas cargadas):  python scripts/seed_presentacion.py
Contraseña de todos los usuarios: la misma de seed_demo.py (DEMO_PASSWORD).
"""

import random
import sys
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlmodel import Session, select

from app.core.database import engine
from app.entities import Activity, ActivityCause, ActivityDetail, Cause, Participation, RegistroHoras
from seed_demo import DEMO_PASSWORD, IMG, hash_password

LA_PAZ = ZoneInfo("America/La_Paz")
PREFIJO = "pres-"

PERSONAS = [
    "Lucía Choque", "Diego Fernández", "Mateo Rocabado", "Isabella Mendoza", "Sebastián Torrico",
    "Gabriela Saavedra", "Andrés Claure", "Daniela Antezana", "Fernando Arnez", "Natalia Zurita",
    "Rodrigo Montaño", "Paola Cáceres", "Javier Villca", "Andrea Siles", "Marcelo Guzmán",
    "Carla Ayala", "Bruno Salazar", "Mariana Camacho", "Esteban Pinto", "Fabiola Orellana",
    "Gonzalo Terrazas", "Jimena Laime", "Kevin Condori", "Lorena Huanca", "Miguel Quiroga",
    "Nicole Escóbar", "Óscar Ugarte", "Patricia Chávez", "Ramiro Calle", "Silvia Paredes",
    "Ignacio Veizaga", "Úrsula Cortez", "Vanessa Aguilar", "Wilmer Copa", "Ximena Arandia",
    "Yerko Baldivieso", "Zulema Torrez", "Adriana Medina", "Bernardo Lazarte", "Cecilia Montero",
    "Emilio Ríos", "Florencia Aliaga",
]
ORGANIZADORAS = 14  # las primeras 14 personas publican actividades

FOTO = {
    "playa": "1618477461853-cf6ed80faba5",
    "escuela": "1503676260728-1c00da094a0b",
    "mascotas": "1548199973-03cce0bbc87b",
    "abuelos": "1516307365426-bea591f05011",
    "computadora": "1517694712202-14dd9538aa97",
    "deporte": "1574629810360-7efbbe195018",
    "arte": "1460661419201-fd4cecdf8a8b",
    "salud": "1576091160550-2173dba999ef",
    "reciclaje": "1532996122724-e3c354a0b15b",
    "plantas": "1542601906990-b4d3fb778b09",
    "biblioteca": "1481627834876-b7833e8f5570",
    "auxilios": "1584515933487-779824d29309",
    "cine": "1489599849927-2ee91cede3ba",
    "comida": "1488459716781-31db52582fe9",
    "huerto": "1416879595882-3373a0480b5b",
    "ropa": "1489987707025-afc232f7ea0f",
}

# (nombre, causas, lugar, dirección, lat, lng, foto, cupos, días desde hoy, hora, descripción)
ACTIVIDADES = [
    ("Siembra de árboles en la Laguna Alalay", ["medio-ambiente", "comunidad"], "Laguna Alalay, orilla norte", "Av. Guayacán, Cochabamba", -17.4103, -66.1406, "plantas", 25, 4, 8,
     "Plantamos molles y jacarandás en la orilla norte de la laguna. Llevamos plantines, palas y agua; trae gorra y ropa cómoda."),
    ("Limpieza del cerro San Pedro", ["medio-ambiente"], "Cristo de la Concordia", "Cerro San Pedro, Cochabamba", -17.3846, -66.1347, "playa", 20, 6, 8,
     "Recogemos plástico y vidrio en el sendero que sube al Cristo. Hay bolsas y guantes para todos."),
    ("Punto limpio de electrónicos en la UMSS", ["medio-ambiente", "tecnologia-social"], "Universidad Mayor de San Simón", "Av. Oquendo, Cochabamba", -17.3937, -66.1460, "reciclaje", 12, 9, 10,
     "Recibimos celulares, cargadores y computadoras viejas para separarlas y entregarlas a un reciclador autorizado."),
    ("Compostaje comunitario en Tiquipaya", ["medio-ambiente", "comunidad"], "Plaza principal de Tiquipaya", "Tiquipaya, Cochabamba", -17.3380, -66.2160, "huerto", 15, 12, 9,
     "Armamos composteras con las vecinas del barrio y enseñamos a separar los residuos orgánicos."),
    ("Refuerzo escolar de lectura en Villa Pagador", ["educacion", "ninez-y-juventud"], "Unidad Educativa Villa Pagador", "Distrito 14, Cochabamba", -17.4420, -66.1460, "escuela", 10, 3, 15,
     "Leemos con niñas y niños de segundo y tercero de primaria. No hace falta experiencia, solo paciencia."),
    ("Club de ciencia para niñas en Sacaba", ["educacion", "ninez-y-juventud", "tecnologia-social"], "Plaza principal de Sacaba", "Sacaba, Cochabamba", -17.4040, -66.0400, "computadora", 12, 7, 14,
     "Experimentos sencillos de física y química para despertar vocaciones científicas en niñas de 9 a 12 años."),
    ("Biblioteca rodante en Quillacollo", ["educacion", "cultura-y-arte"], "Plaza Bolívar de Quillacollo", "Quillacollo, Cochabamba", -17.3925, -66.2788, "biblioteca", 8, 10, 10,
     "Llevamos cajas de libros a la plaza y armamos una ronda de lectura para familias."),
    ("Clases de inglés para colegiales", ["educacion", "ninez-y-juventud"], "Palacio Portales", "Av. Potosí, Cochabamba", -17.3720, -66.1530, "escuela", 10, 5, 16,
     "Conversación en inglés para estudiantes de secundaria que preparan su bachillerato."),
    ("Campaña de donación de sangre", ["salud", "comunidad"], "Hospital Viedma", "Av. Aniceto Arce, Cochabamba", -17.3865, -66.1489, "salud", 30, 8, 8,
     "Apoyamos en el registro y la orientación de donantes. El banco de sangre necesita todos los grupos."),
    ("Control de presión en el mercado La Cancha", ["salud", "adulto-mayor"], "Mercado La Cancha", "Av. Aroma, Cochabamba", -17.4024, -66.1580, "auxilios", 12, 4, 9,
     "Tomamos la presión a comerciantes y compradores, con estudiantes de enfermería que guían cada puesto."),
    ("Charla de salud mental para universitarios", ["salud", "ninez-y-juventud"], "Universidad Mayor de San Simón", "Av. Oquendo, Cochabamba", -17.3937, -66.1460, "salud", 40, 11, 18,
     "Una psicóloga habla de estrés y ansiedad en época de exámenes. Ayudamos con la logística y el registro."),
    ("Jornada de adopción de perros y gatos", ["animales"], "Parque de la Familia", "Av. Uyuni, Cochabamba", -17.3779, -66.1543, "mascotas", 15, 6, 10,
     "Acompañamos a las familias que quieren adoptar y cuidamos a los animales durante la feria."),
    ("Esterilización gratuita de mascotas en Colcapirhua", ["animales", "salud"], "Plaza de Colcapirhua", "Colcapirhua, Cochabamba", -17.3870, -66.2390, "mascotas", 10, 13, 8,
     "Ayudamos a los veterinarios con el registro y la recuperación de perros y gatos después de la cirugía."),
    ("Paseo de perros del refugio", ["animales"], "Refugio Patitas", "Av. Petrolera km 3, Cochabamba", -17.4250, -66.1200, "mascotas", 12, 2, 16,
     "Sacamos a pasear a los perros del refugio para que socialicen. Trae zapatos cómodos."),
    ("Tarde de juegos en el hogar San José", ["adulto-mayor", "comunidad"], "Hogar de ancianos San José", "Calle Jordán, Cochabamba", -17.3900, -66.1600, "abuelos", 10, 5, 15,
     "Jugamos lotería, cartas y ajedrez con las abuelas y los abuelos del hogar."),
    ("Celulares sin miedo: taller para abuelos", ["adulto-mayor", "tecnologia-social"], "Biblioteca Municipal", "Plaza 14 de Septiembre, Cochabamba", -17.3936, -66.1570, "computadora", 12, 9, 10,
     "Enseñamos a hacer videollamadas, usar WhatsApp y reconocer mensajes falsos."),
    ("Entrega de frazadas en la zona sur", ["adulto-mayor", "comunidad"], "Zona Sud", "Av. Petrolera, Cochabamba", -17.4300, -66.1550, "ropa", 20, 14, 9,
     "Repartimos frazadas y ropa de abrigo casa por casa a personas mayores que viven solas."),
    ("Olla común en la Coronilla", ["comunidad"], "Colina de San Sebastián", "La Coronilla, Cochabamba", -17.4030, -66.1650, "comida", 15, 3, 11,
     "Cocinamos y servimos almuerzo para familias del barrio. Hay tareas en cocina, servicio y limpieza."),
    ("Clasificación de víveres para familias", ["comunidad"], "Galpón de la Cruz Roja", "Av. Ayacucho, Cochabamba", -17.3950, -66.1500, "comida", 20, 7, 9,
     "Separamos y empaquetamos alimentos donados para 120 familias de la zona sur."),
    ("Pintado de la cancha del barrio Cerro Verde", ["comunidad", "deporte"], "Cancha de Cerro Verde", "Cerro Verde, Cochabamba", -17.4250, -66.1700, "arte", 18, 15, 8,
     "Renovamos las líneas y los arcos de la cancha donde juegan los chicos del barrio."),
    ("Feria de trueque en El Prado", ["comunidad", "medio-ambiente"], "Paseo El Prado", "Av. Ballivián, Cochabamba", -17.3829, -66.1567, "reciclaje", 15, 10, 10,
     "Intercambio de ropa, libros y juguetes en buen estado. Ayudamos a ordenar los puestos."),
    ("Corrida solidaria 5K", ["deporte", "salud"], "Paseo El Prado", "Av. Ballivián, Cochabamba", -17.3829, -66.1567, "deporte", 40, 16, 7,
     "Lo recaudado va al Hospital del Niño. Necesitamos apoyo en hidratación, inscripciones y la llegada."),
    ("Escuelita de fútbol para niños", ["deporte", "ninez-y-juventud"], "Estadio Félix Capriles", "Av. Ramón Rivero, Cochabamba", -17.3820, -66.1520, "deporte", 12, 4, 15,
     "Entrenamos a niños de 7 a 10 años los sábados por la tarde. Trae ropa deportiva."),
    ("Teatro para niños en el hospital", ["cultura-y-arte", "ninez-y-juventud", "salud"], "Hospital del Niño Manuel Ascencio Villarroel", "Av. Aniceto Arce, Cochabamba", -17.3870, -66.1500, "cine", 10, 8, 15,
     "Presentamos una obra corta de títeres en la sala de pediatría. Ensayamos una hora antes."),
    ("Coro comunitario de fin de año", ["cultura-y-arte"], "Teatro Achá", "Calle España, Cochabamba", -17.3935, -66.1575, "cine", 25, 20, 18,
     "Ensayamos villancicos para cantar en hospitales y hogares. No hace falta saber cantar."),
    ("Taller de fotografía para adolescentes", ["cultura-y-arte", "ninez-y-juventud"], "Casa de la Cultura", "Av. Heroínas, Cochabamba", -17.3935, -66.1590, "arte", 12, 11, 15,
     "Enseñamos a contar historias del barrio con la cámara del celular."),
    ("Reparación de computadoras para escuelas", ["tecnologia-social", "educacion"], "Facultad de Ciencias y Tecnología, UMSS", "Calle Sucre, Cochabamba", -17.3937, -66.1460, "computadora", 10, 6, 14,
     "Arreglamos computadoras donadas e instalamos programas educativos para escuelas rurales."),
    ("Mapeo de rampas accesibles en el centro", ["tecnologia-social", "comunidad"], "Plaza 14 de Septiembre", "Centro, Cochabamba", -17.3936, -66.1570, "computadora", 15, 12, 9,
     "Recorremos el centro con una app de mapas y marcamos qué esquinas tienen rampa y cuáles no."),
    # Jornadas que ya pasaron: quedan cerradas y con horas registradas
    ("Limpieza de la laguna Coña Coña", ["medio-ambiente"], "Laguna Coña Coña", "Zona Coña Coña, Cochabamba", -17.3750, -66.2000, "playa", 15, -10, 8,
     "Retiramos basura de la orilla de la laguna y medimos cuántos kilos se recogieron."),
    ("Colecta de útiles escolares", ["educacion", "ninez-y-juventud"], "Plaza Colón", "Av. Ballivián, Cochabamba", -17.3880, -66.1565, "biblioteca", 12, -15, 10,
     "Recibimos y ordenamos útiles para 80 estudiantes de escuelas de la zona sur."),
    ("Vacunación de perros en Sacaba", ["animales", "salud"], "Plaza principal de Sacaba", "Sacaba, Cochabamba", -17.4040, -66.0400, "mascotas", 10, -7, 9,
     "Apoyamos a la brigada municipal en la vacunación antirrábica casa por casa."),
    ("Navidad anticipada en el hogar de niños", ["ninez-y-juventud", "comunidad"], "Hogar de niños Santa María", "Av. Blanco Galindo, Cochabamba", -17.3900, -66.1900, "comida", 15, -20, 15,
     "Organizamos juegos, merienda y regalos para los niños del hogar."),
    ("Campaña de invierno: abrigo para todos", ["comunidad"], "Parroquia de la Recoleta", "La Recoleta, Cochabamba", -17.3760, -66.1560, "ropa", 20, -25, 9,
     "Clasificamos y entregamos ropa de abrigo donada a familias de la periferia."),
    ("Reforestación en el parque Kanata", ["medio-ambiente"], "Parque Kanata", "Av. Melchor Pérez, Cochabamba", -17.3700, -66.1650, "plantas", 18, -5, 8,
     "Plantamos 150 árboles nativos con vecinos y colegiales."),
]


def correo(nombre: str) -> str:
    sin_tildes = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    nombre_pila, apellido = sin_tildes.lower().split(" ", 1)
    return f"{nombre_pila}.{apellido.replace(' ', '')}@sumate.dev"


def borrar(session: Session) -> None:
    """Quita lo que dejó una corrida anterior: personas pres- y sus actividades, con todo lo que cuelga de ellas."""
    actividades = "(SELECT id FROM activity WHERE owner_id LIKE 'pres-%')"
    for tabla in ("registros_horas", "participations"):
        session.execute(text(f"DELETE FROM {tabla} WHERE activity_id IN {actividades} OR user_id LIKE 'pres-%'"))
    for tabla in ("activity_causes", "activity_detail"):
        session.execute(text(f"DELETE FROM {tabla} WHERE activity_id IN {actividades}"))
    session.execute(text("DELETE FROM activity WHERE owner_id LIKE 'pres-%'"))
    session.execute(text("DELETE FROM session WHERE \"userId\" LIKE 'pres-%'"))
    session.execute(text("DELETE FROM account WHERE \"userId\" LIKE 'pres-%'"))
    session.execute(text("DELETE FROM \"user\" WHERE id LIKE 'pres-%'"))


def crear_personas(session: Session) -> list[str]:
    ahora = datetime.now(timezone.utc)
    clave = hash_password(DEMO_PASSWORD)
    ids = []
    for i, nombre in enumerate(PERSONAS):
        user_id = f"{PREFIJO}{i + 1:02d}"
        session.execute(
            text(
                'INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") '
                "VALUES (:id, :name, :email, true, :ahora, :ahora)"
            ),
            {"id": user_id, "name": nombre, "email": correo(nombre), "ahora": ahora - timedelta(days=60 - i)},
        )
        session.execute(
            text(
                'INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") '
                "VALUES (:id, :user_id, 'credential', :user_id, :password, :ahora, :ahora)"
            ),
            {"id": f"acc-{user_id}", "user_id": user_id, "password": clave, "ahora": ahora},
        )
        ids.append(user_id)
    return ids


def crear_actividades(session: Session, personas: list[str]) -> tuple[int, int, int]:
    azar = random.Random(2026)
    causas = {c.slug: c.id for c in session.exec(select(Cause)).all()}
    hoy = datetime.now(LA_PAZ).replace(hour=0, minute=0, second=0, microsecond=0)
    total_solicitudes = total_horas = 0

    for n, (nombre, slugs, lugar, direccion, lat, lng, foto, cupos, dias, hora, descripcion) in enumerate(ACTIVIDADES):
        duena = personas[n % ORGANIZADORAS]
        fecha = (hoy + timedelta(days=dias, hours=hora)).astimezone(timezone.utc)
        pasada = dias < 0
        actividad = Activity(
            id=uuid.uuid4(),
            name=nombre,
            owner_id=duena,
            image_url=IMG.format(FOTO[foto]),
            date=fecha,
            status="closed" if pasada else "active",
            capacity=cupos,
        )
        session.add(actividad)
        session.flush()
        session.add(
            ActivityDetail(
                activity_id=actividad.id, latitude=lat, longitude=lng, place=lugar, address=direccion, description=descripcion
            )
        )
        for slug in slugs:
            session.add(ActivityCause(activity_id=actividad.id, cause_id=causas[slug]))

        voluntarios = [p for p in personas if p != duena]
        azar.shuffle(voluntarios)
        llena = nombre in ("Control de presión en el mercado La Cancha", "Escuelita de fútbol para niños")
        if pasada:
            aceptadas, pendientes, rechazadas, espera = min(cupos, azar.randint(6, 12)), 0, 0, 0
        elif llena:
            aceptadas, pendientes, rechazadas, espera = cupos, 0, 1, 3
        else:
            aceptadas = max(1, round(cupos * azar.uniform(0.3, 0.7)))
            pendientes, rechazadas, espera = azar.randint(1, 4), azar.randint(0, 1), 0
        cola = iter(voluntarios)
        orden = (
            [("aceptada", next(cola)) for _ in range(aceptadas)]
            + [("pendiente", next(cola)) for _ in range(pendientes)]
            + [("rechazada", next(cola)) for _ in range(rechazadas)]
            + [("en_espera", next(cola)) for _ in range(espera)]
        )
        for k, (estado, user_id) in enumerate(orden):
            # La lista de espera se ordena por llegada: cada solicitud llega un poco después de la anterior
            session.add(Participation(activity_id=actividad.id, user_id=user_id, status=estado,
                                      created_date=datetime.now(timezone.utc) - timedelta(days=20, minutes=-k * 7)))
            total_solicitudes += 1
            if pasada and estado == "aceptada":
                session.add(
                    RegistroHoras(
                        activity_id=actividad.id,
                        user_id=user_id,
                        jornada=(hoy + timedelta(days=dias)).date(),
                        horas=float(azar.choice([2, 3, 3, 4, 4, 5, 6])),
                        estado="confirmada" if azar.random() < 0.85 else "pendiente",
                    )
                )
                total_horas += 1
    return len(ACTIVIDADES), total_solicitudes, total_horas


def seed_presentacion() -> None:
    with Session(engine) as session:
        borrar(session)
        personas = crear_personas(session)
        actividades, solicitudes, horas = crear_actividades(session, personas)
        session.commit()
    print(f"Presentación: {len(personas)} personas, {actividades} actividades, {solicitudes} solicitudes, {horas} jornadas con horas.")


if __name__ == "__main__":
    seed_presentacion()
