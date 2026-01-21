from sqlalchemy import Column, String, ForeignKey, DateTime, event, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.models.base import Base
from app.core.logging import audit_origin_ctx_var

class AuditLog(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String, nullable=False)  # "asset", "user", etc.
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)       # "create", "update", "delete"
    changes = Column(JSONB, default=dict)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    origin = Column(String, nullable=False, default="human", server_default=text("'human'"))

@event.listens_for(AuditLog, "before_insert")
def set_audit_origin(mapper, connection, target):
    if not target.origin or target.origin == "human":
        # Check context var
        ctx_origin = audit_origin_ctx_var.get()
        if ctx_origin:
            target.origin = ctx_origin
        elif target.user_id is None:
            target.origin = "system"
        else:
            target.origin = "human"
