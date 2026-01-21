from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from typing import List, Any, Dict
from datetime import datetime, date
from app.schemas.role import RoleName

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    is_active: bool = True
    asset_set_id: UUID | None = None
    extra: Dict[str, Any] | None = None
    
    # Lifecycle
    employment_end_date: date | None = None

class UserCreate(UserBase):
    password: str | None = None
    roles: List[RoleName] = []

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    is_active: bool | None = None
    password: str | None = None
    roles: List[RoleName] | None = None
    asset_set_id: UUID | None = None
    extra: Dict[str, Any] | None = None
    employment_end_date: date | None = None

class UserRead(UserBase):
    id: UUID
    roles: List[RoleName]
    permissions: List[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator('roles', mode='before')
    @classmethod
    def parse_roles(cls, v: Any) -> List[str]:
        if not v:
            return []
        # Handle list of Role objects or list of strings
        return [role.name if hasattr(role, 'name') else role for role in v]
    
    @field_validator('permissions', mode='before')
    @classmethod
    def parse_permissions(cls, v: Any) -> List[str]:
        # property on model returns list[str], so v should be list[str]
        # But if it wasn't accessed, it might be None?
        # If accessing via from_attributes, it accesses the property.
        if v is None:
            return []
        return v

    class Config:
        from_attributes = True
