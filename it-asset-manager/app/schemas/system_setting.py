from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class SystemSettingBase(BaseModel):
    value: Any
    is_secure: bool = False
    description: Optional[str] = None

class SystemSettingCreate(SystemSettingBase):
    key: str

class SystemSettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None
    is_secure: Optional[bool] = None

class SystemSettingRead(SystemSettingBase):
    id: UUID
    key: str
    created_at: Any
    updated_at: Any
    
    model_config = ConfigDict(from_attributes=True)
