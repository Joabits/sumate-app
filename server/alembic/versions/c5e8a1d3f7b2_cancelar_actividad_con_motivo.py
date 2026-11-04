"""cancelar actividad con motivo

Revision ID: c5e8a1d3f7b2
Revises: 9a4d2b6c8e31
Create Date: 2026-11-03 22:00:00.000000

La organización puede cancelar una actividad con un motivo obligatorio.
Las solicitudes afectadas pasan a canceladas y guardan su estado anterior.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c5e8a1d3f7b2'
down_revision: Union[str, Sequence[str], None] = '9a4d2b6c8e31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'activity',
        sa.Column('motivo_cancelacion', sa.String(length=500), nullable=True),
    )
    op.add_column(
        'participations',
        sa.Column('estado_anterior', sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('participations', 'estado_anterior')
    op.drop_column('activity', 'motivo_cancelacion')
