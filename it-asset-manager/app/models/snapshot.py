from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from app.models.base import Base, TimestampMixin

class Snapshot(Base, TimestampMixin):
    __tablename__ = "snapshot"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
    
    # The PostgreSQL schema where the snapshot data is stored
    schema_name = Column(String, nullable=False, unique=True)
    
    # Snapshot metadata
    entity_counts = Column(JSONB, default=dict)
    size_bytes = Column(Integer, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)







