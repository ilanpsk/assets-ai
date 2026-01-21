from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from app.core.validators import SanitizedString

class AssetBase(BaseModel):
    name: SanitizedString
    asset_type_id: UUID | None = None
    asset_set_id: UUID | None = None
    serial_number: SanitizedString | None = None
    assigned_user_id: UUID | None = None
    location: SanitizedString | None = None
    status: str = "active"
    tags: List[SanitizedString] = []
    extra: Dict[str, Any] = {}

    # Financials
    purchase_price: float | None = None
    purchase_date: date | None = None
    vendor: SanitizedString | None = None
    order_number: SanitizedString | None = None
    warranty_end: date | None = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: SanitizedString | None = None
    asset_type_id: UUID | None = None
    asset_set_id: UUID | None = None
    serial_number: SanitizedString | None = None
    assigned_user_id: UUID | None = None
    location: SanitizedString | None = None
    status: str | None = None
    tags: List[SanitizedString] | None = None
    extra: Dict[str, Any] | None = None

    # Financials
    purchase_price: float | None = None
    purchase_date: date | None = None
    vendor: SanitizedString | None = None
    order_number: SanitizedString | None = None
    warranty_end: date | None = None

class BulkDeleteAssetsRequest(BaseModel):
    asset_ids: List[UUID]

class BulkDeleteAssetsResponse(BaseModel):
    deleted_count: int

from app.schemas.asset_type import AssetTypeRead
from app.schemas.asset_set import AssetSetRead
from app.schemas.asset_status import AssetStatusRead
from app.schemas.user import UserRead

class AssetRead(AssetBase):
    id: UUID
    asset_type: AssetTypeRead | None = None
    asset_set: AssetSetRead | None = None
    status: AssetStatusRead | None = None
    assigned_user: UserRead | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
