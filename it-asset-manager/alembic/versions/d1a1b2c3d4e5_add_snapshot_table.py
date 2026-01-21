"""add snapshot table

Revision ID: d1a1b2c3d4e5
Revises: f04deac99ce6
Create Date: 2025-12-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd1a1b2c3d4e5'
down_revision = '630ff0126d08'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('snapshot',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.UUID(), nullable=True),
        sa.Column('schema_name', sa.String(), nullable=False),
        sa.Column('entity_counts', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], name=op.f('fk_snapshot_created_by_id_user')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_snapshot')),
        sa.UniqueConstraint('schema_name', name=op.f('uq_snapshot_schema_name'))
    )


def downgrade():
    op.drop_table('snapshot')

