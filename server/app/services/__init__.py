"""
app/services — las reglas de negocio (como los @Service de Java).

Cada service recibe la sesión, arma sus repositories y expone los casos de uso.
Cada caso de uso valida las reglas y termina con commit (como @Transactional):
si algo falla antes, no se guarda nada.
"""
