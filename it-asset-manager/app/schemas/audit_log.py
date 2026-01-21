from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel
from uuid import UUID

class AuditLogRead(BaseModel):
    id: UUID
    entity_type: str
    entity_id: str
    action: str
    changes: Dict[str, Any]
    user_id: Optional[UUID]
    timestamp: datetime
    origin: str
    
    # Enriched fields
    user_name: Optional[str] = None
    entity_name: Optional[str] = None
    
    class Config:
        from_attributes = True
