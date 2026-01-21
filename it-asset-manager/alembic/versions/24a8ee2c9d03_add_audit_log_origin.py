"""add_audit_log_origin

Revision ID: 24a8ee2c9d03
Revises: d3a40f900074
Create Date: 2025-12-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '24a8ee2c9d03'
down_revision = 'd3a40f900074'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add column as nullable first
    op.add_column('auditlog', sa.Column('origin', sa.String(), nullable=True))
    
    # 2. Backfill
    # origin='system' where user_id is null
    op.execute("UPDATE auditlog SET origin = 'system' WHERE user_id IS NULL")
    # origin='human' where user_id is not null
    op.execute("UPDATE auditlog SET origin = 'human' WHERE user_id IS NOT NULL")
    
    # 3. Make not null and set default
    op.alter_column(
        "auditlog",
        "origin",
        existing_type=sa.String(),
        nullable=False,
        server_default=sa.text("'human'"),
    )


def downgrade():
    op.drop_column('auditlog', 'origin')

