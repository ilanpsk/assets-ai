from sqlalchemy import Column, String, ForeignKey, ARRAY, Index, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin
from app.models.user import User # noqa

class Asset(Base, TimestampMixin):
    __tablename__ = "asset"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    
    # Financials
    purchase_price = Column(Numeric(10, 2), nullable=True)
    purchase_date = Column(Date, nullable=True)
    vendor = Column(String, nullable=True)
    order_number = Column(String, nullable=True)
    warranty_end = Column(Date, nullable=True)
    
    asset_type_id = Column(UUID(as_uuid=True), ForeignKey("asset_types.id", ondelete="SET NULL"), nullable=True)
    asset_type = relationship("AssetType")

    # Using string reference to avoid circular import or loading issues
    asset_set_id = Column(UUID(as_uuid=True), ForeignKey("asset_set.id", ondelete="SET NULL"), nullable=True)
    asset_set = relationship("AssetSet")
    
    serial_number = Column(String, nullable=True, unique=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    assigned_user = relationship("User")
    location = Column(String, nullable=True)
    
    status_id = Column(UUID(as_uuid=True), ForeignKey("asset_statuses.id", ondelete="SET NULL"), nullable=True)
    status = relationship("AssetStatus")
    
    tags = Column(ARRAY(String), default=[])
    source = Column(String, nullable=True)
    extra = Column(JSONB, default=dict)

    __table_args__ = (
        Index(
            "ix_asset_trgm",
            "name",
            "serial_number",
            "location",
            postgresql_using="gin",
            postgresql_ops={
                "name": "gin_trgm_ops",
                "serial_number": "gin_trgm_ops",
                "location": "gin_trgm_ops",
            },
        ),
    )
