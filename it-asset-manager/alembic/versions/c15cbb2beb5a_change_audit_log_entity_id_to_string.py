"""change_audit_log_entity_id_to_string

Revision ID: c15cbb2beb5a
Revises: e2b2c3d4e5f6
Create Date: 2025-12-15 16:09:51.178760

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c15cbb2beb5a'
down_revision = 'e2b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Change entity_id from UUID to String
    op.alter_column('auditlog', 'entity_id',
               existing_type=postgresql.UUID(),
               type_=sa.String(),
               existing_nullable=False,
               postgresql_using='entity_id::text')


def downgrade():
    # Change entity_id back to UUID
    # Note: This will fail if non-UUID strings have been inserted
    op.alter_column('auditlog', 'entity_id',
               existing_type=sa.String(),
               type_=postgresql.UUID(),
               existing_nullable=False,
               postgresql_using='entity_id::uuid')
