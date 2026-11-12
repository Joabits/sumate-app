"""retirarse de una actividad

Revision ID: f3b9d2e6a1c4
Revises: b4f1c8e2a7d3
Create Date: 2026-11-12 10:00:00.000000

El voluntario se retira de una actividad: la solicitud queda como «retirada».
Un aceptado escribe el motivo (hasta 24 horas antes); un pendiente o en
espera se retira sin motivo.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f3b9d2e6a1c4'
down_revision: Union[str, Sequence[str], None] = 'b4f1c8e2a7d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'participations',
        sa.Column('motivo_retiro', sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM participations WHERE status = 'retirada'")
    op.drop_column('participations', 'motivo_retiro')
