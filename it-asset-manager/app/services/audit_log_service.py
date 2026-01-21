from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, cast, String
from sqlalchemy.orm import aliased

from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.asset import Asset
from app.schemas.audit_log import AuditLogRead

async def get_audit_logs(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Tuple[List[AuditLogRead], int]:
    TargetUser = aliased(User)
    
    # Build base query with joins for enrichment
    stmt = select(
        AuditLog,
        User.full_name.label("user_name"),
        case(
            (AuditLog.entity_type == "asset", Asset.name),
            (AuditLog.entity_type == "user", TargetUser.full_name),
            else_=AuditLog.entity_id
        ).label("entity_name")
    ).outerjoin(User, AuditLog.user_id == User.id) \
     .outerjoin(Asset, (AuditLog.entity_type == "asset") & (AuditLog.entity_id == cast(Asset.id, String))) \
     .outerjoin(TargetUser, (AuditLog.entity_type == "user") & (AuditLog.entity_id == cast(TargetUser.id, String)))
    
    # Apply filters
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if start_date:
        stmt = stmt.where(AuditLog.timestamp >= start_date)
    if end_date:
        stmt = stmt.where(AuditLog.timestamp <= end_date)
    
    # Get total count
    total_count = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    
    # Apply pagination and ordering
    stmt = stmt.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit)
    
    # Execute and build results
    rows = (await db.execute(stmt)).all()
    results = [
        AuditLogRead.model_validate({
            **log.__dict__,
            "user_name": row.user_name or "System",
            "entity_name": row.entity_name
        })
        for row in rows
        for log in [row[0]]
    ]
    
    return results, total_count

