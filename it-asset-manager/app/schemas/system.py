from pydantic import BaseModel
from typing import Optional

class SystemStatus(BaseModel):
    initialized: bool

class SetupRequest(BaseModel):
    admin_email: str
    admin_password: str
    admin_full_name: Optional[str] = "System Admin"
    seed_data: bool = True







