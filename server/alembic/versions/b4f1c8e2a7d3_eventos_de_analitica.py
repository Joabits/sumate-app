"""eventos de analitica

Revision ID: b4f1c8e2a7d3
Revises: e7a2c9d4b1f6
Create Date: 2026-11-10 16:30:00.000000

Una línea por cada evento de analítica: nombre, propiedades y fecha. No guarda
quién fue: la tabla no tiene usuario ni actividad.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b4f1c8e2a7d3'
down_revision: Union[str, Sequence[str], None] = 'e7a2c9d4b1f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'eventos',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('evento', sqlmodel.sql.sqltypes.AutoString(length=60), nullable=False),
        sa.Column('props', sa.JSON(), nullable=False),
        sa.Column('fecha', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_eventos_evento'), 'eventos', ['evento'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_eventos_evento'), table_name='eventos')
    op.drop_table('eventos')
