from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class AssetSetCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the asset set")
    description: Optional[str] = Field(None, description="Description of what this set contains")

class AssetSetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None

class AssetSetRead(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    created_by_id: Optional[UUID]

    class Config:
        from_attributes = True

