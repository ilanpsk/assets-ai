from sqlalchemy import Column, String, Boolean, Integer, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.models.base import Base, TimestampMixin

class CustomFieldTarget(str, enum.Enum):
    asset = "asset"
    user = "user"

class CustomFieldType(str, enum.Enum):
    string = "string"
    integer = "integer"
    boolean = "boolean"
    date = "date"
    enum = "enum"
    reference = "reference"

class CustomFieldDefinition(Base, TimestampMixin):
    __tablename__ = "custom_field_definition"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target = Column(Enum(CustomFieldTarget), nullable=False)
    asset_type_id = Column(UUID(as_uuid=True), ForeignKey("asset_types.id", ondelete="CASCADE"), nullable=True)
    asset_set_id = Column(UUID(as_uuid=True), ForeignKey("asset_set.id", ondelete="CASCADE"), nullable=True)
    key = Column(String, nullable=False)
    label = Column(String, nullable=False)
    field_type = Column(Enum(CustomFieldType), nullable=False)
    required = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    config = Column(JSONB, default=dict)
