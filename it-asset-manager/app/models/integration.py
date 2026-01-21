from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.models.base import Base, TimestampMixin

class Integration(Base, TimestampMixin):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False)  # "jamf", "intune", "okta_scim", ...
    name = Column(String, nullable=False)
    enabled = Column(Boolean, default=False)
    config = Column(JSONB, default=dict)
