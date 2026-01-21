"""add id to system setting

Revision ID: e2b2c3d4e5f6
Revises: d1a1b2c3d4e5
Create Date: 2025-12-08 12:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e2b2c3d4e5f6'
# Chain after latest migration to keep a single head
down_revision = 'd1a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Ensure pgcrypto is available so gen_random_uuid works.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 2. Add 'id' column, nullable first to populate.
    op.add_column('system_setting', sa.Column('id', sa.UUID(), nullable=True))

    # 3. Populate 'id' (using random uuid).
    op.execute("UPDATE system_setting SET id = gen_random_uuid()")

    # 4. Make 'id' not null.
    op.alter_column('system_setting', 'id', nullable=False)

    # 5. Drop old PK on key.
    op.drop_constraint('pk_system_setting', 'system_setting', type_='primary')

    # 6. Add new PK on id.
    op.create_primary_key('pk_system_setting', 'system_setting', ['id'])

    # 7. Make 'key' unique.
    op.create_unique_constraint('uq_system_setting_key', 'system_setting', ['key'])


def downgrade():
    op.drop_constraint('uq_system_setting_key', 'system_setting', type_='unique')
    op.drop_constraint('pk_system_setting', 'system_setting', type_='primary')
    op.create_primary_key('pk_system_setting', 'system_setting', ['key'])
    op.drop_column('system_setting', 'id')

