from pydantic import BaseModel, Field, AliasChoices
from uuid import UUID
from typing import Optional

class AssetStatusBase(BaseModel):
    key: str
    label: str
    is_default: bool = False
    is_system: bool = False

class AssetStatusCreate(AssetStatusBase):
    pass

class AssetStatusUpdate(BaseModel):
    label: Optional[str] = None
    # We typically don't allow updating 'key' as it acts as the ID in the route
    # is_default/is_system logic might be restricted too

class AssetStatusRead(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    # Keep key/label for backward compatibility or alternative mapping
    key: str = Field(validation_alias=AliasChoices('key', 'name'))
    label: str | None = Field(default=None, validation_alias=AliasChoices('label', 'description', 'name'))
    is_default: bool = False
    is_system: bool = False

    class Config:
        from_attributes = True
