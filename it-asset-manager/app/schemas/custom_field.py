from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from enum import Enum

# Re-define enums here or import from models if possible, but usually schemas have their own enums or use str
# app/models/custom_field.py has CustomFieldTarget and CustomFieldType enums.
# Let's import them or redefine. Importing is better for consistency.
from app.models.custom_field import CustomFieldTarget, CustomFieldType

class CustomFieldDefinitionBase(BaseModel):
    label: str
    key: str
    target: CustomFieldTarget
    field_type: CustomFieldType
    asset_type_id: UUID | None = None
    asset_set_id: UUID | None = None
    required: bool = False
    order: int = 0
    config: dict | None = None

class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass

class CustomFieldDefinitionUpdate(BaseModel):
    label: str | None = None
    field_type: CustomFieldType | None = None
    asset_type_id: UUID | None = None
    asset_set_id: UUID | None = None
    required: bool | None = None
    order: int | None = None
    config: dict | None = None

class CustomFieldDefinitionRead(CustomFieldDefinitionBase):
    id: UUID

    class Config:
        from_attributes = True
