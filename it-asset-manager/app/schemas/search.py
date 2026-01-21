from typing import List
from pydantic import BaseModel
from app.schemas.asset import AssetRead
from app.schemas.user import UserRead
from app.schemas.audit_log import AuditLogRead

class GlobalSearchResult(BaseModel):
    assets: List[AssetRead]
    users: List[UserRead]
    logs: List[AuditLogRead]







