from pydantic import BaseModel, Field, AliasChoices
from uuid import UUID

class AssetTypeBase(BaseModel):
    name: str
    description: str | None = None

class AssetTypeCreate(AssetTypeBase):
    pass

class AssetTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class AssetTypeRead(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    key: str = Field(validation_alias=AliasChoices('key', 'name'))

    class Config:
        from_attributes = True
