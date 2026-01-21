from sqlalchemy import Column, String, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.models.base import Base, TimestampMixin

class RequestStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"

class RequestType(str, enum.Enum):
    new_asset = "new_asset"
    assigned_asset = "assigned_asset"
    other = "other"

class Request(Base, TimestampMixin):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("asset.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.open, nullable=False)
    request_type = Column(Enum(RequestType), default=RequestType.other, nullable=False)

    requester = relationship("User", backref="requests", lazy="selectin")
    asset = relationship("Asset", backref="requests", lazy="selectin")
