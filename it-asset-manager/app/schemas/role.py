from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class RoleName(str, Enum):
    admin = "admin"
    it = "it"
    user = "user"

class PermissionRead(BaseModel):
    slug: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class RoleBase(BaseModel):
    description: Optional[str] = None

class RoleCreate(RoleBase):
    name: str

class RoleUpdate(RoleBase):
    pass

class RolePermissionsUpdate(BaseModel):
    permissions: List[str]

class RoleRead(RoleBase):
    name: str
    permissions: List[PermissionRead] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
