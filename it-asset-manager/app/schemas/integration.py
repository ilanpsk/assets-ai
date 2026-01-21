from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any

class IntegrationBase(BaseModel):
    type: str
    name: str
    config: Dict[str, Any] = {}
    enabled: bool = True

class IntegrationCreate(IntegrationBase):
    pass

class IntegrationUpdate(BaseModel):
    type: str | None = None
    name: str | None = None
    config: Dict[str, Any] | None = None
    enabled: bool | None = None

class IntegrationRead(IntegrationBase):
    id: UUID

    class Config:
        from_attributes = True
