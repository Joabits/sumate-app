"""create activity tables

Revision ID: 5b8e2c4a7f13
Revises:
Create Date: 2026-10-27 23:10:00.000000

Las tablas activity y activity_detail se crearon a mano antes de usar Alembic
(activity venía de una tabla events). Esta migración las crea tal como estaban
en ese momento, para que una base nueva pueda llegar a head solo con
`alembic upgrade head`. La migración d26545d64587 después las ajusta al modelo.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b8e2c4a7f13'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('activity',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('modified_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('deleted_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('owner_id', sa.String(), nullable=False),
    sa.Column('image_url', sa.String(), nullable=False),
    sa.Column('date', sa.DateTime(), nullable=False),
    sa.Column('status', sa.String(length=20), server_default=sa.text("'draft'"), nullable=False),
    sa.Column('capacity', sa.Integer(), server_default=sa.text('1'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_events_date', 'activity', ['date'], unique=False)
    op.create_index('ix_events_name', 'activity', ['name'], unique=False)
    op.create_index('ix_events_owner_id', 'activity', ['owner_id'], unique=False)

    op.create_table('activity_detail',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('modified_date', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.Column('deleted_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('activity_id', sa.Uuid(), nullable=False),
    sa.Column('latitude', sa.Float(), nullable=True),
    sa.Column('longitude', sa.Float(), nullable=True),
    sa.Column('place', sa.String(length=255), nullable=True),
    sa.Column('address', sa.String(length=500), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['activity_id'], ['activity.id'], name='activity_detail_activity_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('activity_id', name='activity_detail_activity_id_key')
    )
    op.create_index('ix_activity_detail_activity_id', 'activity_detail', ['activity_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_activity_detail_activity_id', table_name='activity_detail')
    op.drop_table('activity_detail')
    op.drop_index('ix_events_owner_id', table_name='activity')
    op.drop_index('ix_events_name', table_name='activity')
    op.drop_index('ix_events_date', table_name='activity')
    op.drop_table('activity')
