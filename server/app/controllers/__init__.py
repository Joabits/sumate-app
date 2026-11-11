"""
app/controllers — las rutas HTTP (como los @RestController de Java).

Cada controlador es un APIRouter. Un endpoint recibe la petición, le pasa los
datos al service inyectado y devuelve su respuesta. No consulta la base ni
decide reglas.
"""
