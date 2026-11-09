# Backend — arquitectura MVC

```text
app/
├── main.py              crea la app y registra los controladores
├── models/              M  tablas + reglas de negocio + consultas
│   ├── activity.py          Activity (estados, publicar, cerrar, cancelar...)
│   ├── activity_detail.py   ubicación y descripción
│   ├── activity_search.py   búsqueda con filtros (pantalla Buscar)
│   ├── cause.py             Cause y ActivityCause
│   ├── participation.py     Participation (solicitudes y lista de espera)
│   ├── user.py              tabla `user` de Better Auth (solo lectura)
│   ├── base.py              id, fechas y borrado lógico
│   └── exceptions.py        errores de negocio con su código
├── views/               V  lo que entra y sale de la API
│   ├── activity_view.py     esquemas + render_activity_list, render_activity_detail...
│   ├── cause_view.py
│   └── participation_view.py  render_trayectoria
├── controllers/         C  endpoints (APIRouter)
│   ├── activity_controller.py     /api/activities
│   ├── cause_controller.py        /api/activities/causes
│   ├── participation_controller.py  /api/participaciones
│   └── health_controller.py       /health
└── core/                transversal: config, base de datos, JWT, errores, imágenes, mapa
```

## Quién hace qué

| Capa | Hace | No hace |
|---|---|---|
| **Model** | Define la tabla, valida sus datos y aplica las reglas (`activity.cancelar(motivo)`, `solicitud.aceptar_en(session, actividad)`). Trae sus consultas como métodos de clase (`Activity.get_or_404(...)`, `Participation.count_accepted(...)`). | Conocer HTTP ni armar respuestas. |
| **View** | Esquemas de entrada/salida (Pydantic) y funciones `render_*` que convierten modelos en el JSON del frontend. | Consultar la base ni decidir reglas. |
| **Controller** | Recibe la petición, carga los modelos, les pide aplicar sus reglas, hace `session.commit()` y devuelve la vista. | Tener reglas de negocio propias. |

Un endpoint típico:

```python
@router.post("/{activity_id}/close")
def close_activity(activity_id: UUID, current_user: CurrentUser, session: DBSession):
    activity = _owned_activity(session, activity_id, current_user.user_id, "...", for_update=True)
    activity.close()          # regla del modelo
    session.commit()          # el controlador decide cuándo se guarda
    return Response(status_code=200)
```

Si un controlador lanza un error antes del commit, la sesión se cierra sin guardar nada.

## Errores

Los modelos lanzan errores de `models/exceptions.py`. `core/errors.py` los convierte en
`{"error": {"code": "...", "message": "..."}}` con el estado HTTP de su familia:
`NotFoundException` 404, `ForbiddenException` 403, `ConflictException` 409, `ValidationException` 400.

## Agregar una tabla nueva

1. Crea el modelo en `app/models/` y agrégalo a `app/models/__init__.py` (Alembic lo lee de ahí).
2. `alembic revision --autogenerate -m "..."` y `alembic upgrade head`.
3. Esquemas y `render_*` en `app/views/`, endpoints en `app/controllers/`.
4. Registra el router en `app/main.py`.

## Pruebas

`pytest` desde `server/`. Usan SQLite en memoria (`tests/conftest.py`) y llaman a los
controladores como funciones (`tests/helpers.py`), sin levantar el servidor.
