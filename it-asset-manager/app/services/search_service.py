from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, cast, String
from sqlalchemy.orm import joinedload

from app.models.asset import Asset
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.logging import log_activity

@log_activity
async def search_assets(db: AsyncSession, query: str) -> List[Asset]:
    if not query:
        res = await db.execute(select(Asset).limit(50))
        return res.scalars().all()

    pattern = f"%{query}%"
    res = await db.execute(
        select(Asset).where(
            or_(
                Asset.name.ilike(pattern),
                Asset.serial_number.ilike(pattern),
                Asset.location.ilike(pattern),
            )
        ).limit(50)
    )
    return res.scalars().all()

@log_activity
async def search_global(db: AsyncSession, query: str) -> Dict[str, List[Any]]:
    if not query:
        return {"assets": [], "users": [], "logs": []}
    
    pattern = f"%{query}%"
    
    # 1. Assets (include assigned user search)
    assets_res = await db.execute(
        select(Asset)
        .outerjoin(User, Asset.assigned_user_id == User.id)
        .options(
            joinedload(Asset.status),
            joinedload(Asset.asset_type),
            joinedload(Asset.asset_set),
            joinedload(Asset.assigned_user)
        )
        .where(
            or_(
                Asset.name.ilike(pattern),
                Asset.serial_number.ilike(pattern),
                Asset.location.ilike(pattern),
                User.full_name.ilike(pattern),
                User.email.ilike(pattern)
            )
        )
        .limit(10)
    )
    assets = assets_res.scalars().all()
    
    # 2. Users
    users_res = await db.execute(
        select(User).where(
            or_(
                User.full_name.ilike(pattern),
                User.email.ilike(pattern)
            )
        ).limit(10)
    )
    users = users_res.scalars().all()
    
    # 3. Audit Logs
    logs_res = await db.execute(
        select(AuditLog).where(
            or_(
                AuditLog.action.ilike(pattern),
                AuditLog.entity_type.ilike(pattern),
                cast(AuditLog.changes, String).ilike(pattern)
            )
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
    )
    logs = logs_res.scalars().all()
    
    return {
        "assets": assets,
        "users": users,
        "logs": logs
    }
