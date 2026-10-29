"""estados de participacion en espanol

Revision ID: 9a4d2b6c8e31
Revises: 7c3f9a1e5b20
Create Date: 2026-10-29 22:00:00.000000

Traduce los valores de participations.status:
pending → pendiente, accepted → aceptada, rejected → rechazada.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '9a4d2b6c8e31'
down_revision: Union[str, Sequence[str], None] = '7c3f9a1e5b20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TRADUCCIONES = {
    'pending': 'pendiente',
    'accepted': 'aceptada',
    'rejected': 'rechazada',
}


def upgrade() -> None:
    """Upgrade schema."""
    for ingles, espanol in TRADUCCIONES.items():
        op.execute(
            f"UPDATE participations SET status = '{espanol}' WHERE status = '{ingles}'"
        )


def downgrade() -> None:
    """Downgrade schema."""
    for ingles, espanol in TRADUCCIONES.items():
        op.execute(
            f"UPDATE participations SET status = '{ingles}' WHERE status = '{espanol}'"
        )
