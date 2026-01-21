from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
import uuid

from app.models.base import Base, TimestampMixin

class SystemSetting(Base, TimestampMixin):
    __tablename__ = "system_setting"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String, unique=True, nullable=False)
    value = Column(JSONB, nullable=False)
    is_secure = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
