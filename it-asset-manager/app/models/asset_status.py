from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.models.base import Base, TimestampMixin

class AssetStatus(Base, TimestampMixin):
    __tablename__ = "asset_statuses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False) 
    description = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
