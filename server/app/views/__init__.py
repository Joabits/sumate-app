"""
app/views — la V de MVC.

En una API la vista es el JSON que recibe el frontend. Aquí viven los esquemas
de entrada y salida (Pydantic) y las funciones `render_*` que convierten los
modelos en esa respuesta. Las vistas no consultan la base ni deciden reglas.
"""
