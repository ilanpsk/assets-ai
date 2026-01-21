from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.models.request import RequestStatus, RequestType
from app.schemas.user import UserRead
from app.schemas.asset import AssetRead

class RequestBase(BaseModel):
    title: str
    description: str | None = None
    status: RequestStatus = RequestStatus.open
    request_type: RequestType = RequestType.other
    asset_id: UUID | None = None

class RequestCreate(RequestBase):
    pass

class RequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: RequestStatus | None = None
    request_type: RequestType | None = None
    asset_id: UUID | None = None

class RequestRead(RequestBase):
    id: UUID
    requester_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    requester: Optional[UserRead] = None
    asset: Optional[AssetRead] = None

    model_config = ConfigDict(from_attributes=True)
