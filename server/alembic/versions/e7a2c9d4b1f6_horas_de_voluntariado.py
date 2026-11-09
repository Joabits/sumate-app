"""horas de voluntariado por jornada

Revision ID: e7a2c9d4b1f6
Revises: c5e8a1d3f7b2
Create Date: 2026-11-08 10:00:00.000000

La organización registra horas por jornada para los participantes aceptados de
una actividad terminada. El voluntario las acepta o las reclama con motivo; una
corrección las deja otra vez pendientes. Solo las confirmadas suman a la constancia.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e7a2c9d4b1f6'
down_revision: Union[str, Sequence[str], None] = 'c5e8a1d3f7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'registros_horas',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('modified_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('activity_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('jornada', sa.Date(), nullable=False),
        sa.Column('horas', sa.Float(), nullable=False),
        sa.Column('estado', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('motivo_reclamo', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('horas_anteriores', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activity.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id', 'user_id', 'jornada', name='uq_registro_horas_jornada'),
    )
    op.create_index(op.f('ix_registros_horas_activity_id'), 'registros_horas', ['activity_id'], unique=False)
    op.create_index(op.f('ix_registros_horas_user_id'), 'registros_horas', ['user_id'], unique=False)
    op.create_index(op.f('ix_registros_horas_estado'), 'registros_horas', ['estado'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_registros_horas_estado'), table_name='registros_horas')
    op.drop_index(op.f('ix_registros_horas_user_id'), table_name='registros_horas')
    op.drop_index(op.f('ix_registros_horas_activity_id'), table_name='registros_horas')
    op.drop_table('registros_horas')
