from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.models.base import Base, TimestampMixin

class AssetSet(Base, TimestampMixin):
    __tablename__ = "asset_set"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
