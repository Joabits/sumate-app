"""add status to participations

Revision ID: 7c3f9a1e5b20
Revises: d26545d64587
Create Date: 2026-10-29 21:00:00.000000

Las participaciones pasan a ser solicitudes que el organizador acepta o rechaza.
Las filas que ya existían eran inscripciones confirmadas, así que quedan como
'accepted'. Las nuevas filas reciben el estado desde la aplicación ('pending').
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c3f9a1e5b20'
down_revision: Union[str, Sequence[str], None] = 'd26545d64587'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'participations',
        sa.Column('status', sa.String(length=20), nullable=False, server_default='accepted'),
    )
    with op.batch_alter_table('participations') as batch_op:
        batch_op.alter_column('status', server_default=None)
        batch_op.create_index(batch_op.f('ix_participations_status'), ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('participations') as batch_op:
        batch_op.drop_index(batch_op.f('ix_participations_status'))
        batch_op.drop_column('status')
