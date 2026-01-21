from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_role
from app.schemas.audit_log import AuditLogRead
from app.schemas.role import RoleName
from app.core.logging import log_activity
from app.services import audit_log_service

router = APIRouter()

@router.get("/", response_model=List[AuditLogRead])
@log_activity
async def get_audit_logs(
    response: Response,
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. 'asset', 'user')"),
    entity_id: Optional[str] = Query(None, description="Filter by specific entity ID"),
    user_id: Optional[UUID] = Query(None, description="Filter by actor (user who performed the action)"),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.it)),
):
    results, total_count = await audit_log_service.get_audit_logs(
        db,
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date
    )
    
    response.headers["X-Total-Count"] = str(total_count)
    return results
