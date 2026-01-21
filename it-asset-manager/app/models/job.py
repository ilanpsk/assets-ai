from sqlalchemy import Column, String, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.models.base import Base, TimestampMixin

class JobType(str, enum.Enum):
    import_assets = "import_assets"
    sync_integration = "sync_integration"

class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"

class Job(Base, TimestampMixin):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.pending, nullable=False)
    payload = Column(JSONB, default=dict)
    result = Column(JSONB, default=dict)
    error = Column(Text, nullable=True)
