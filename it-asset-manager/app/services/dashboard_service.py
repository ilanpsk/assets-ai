from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case, cast, String
from sqlalchemy.orm import aliased, selectinload

from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.request import Request, RequestStatus
from app.core.logging import log_activity

@log_activity
async def get_stats(db: AsyncSession):
    # Total Assets
    total_assets = await db.scalar(select(func.count(Asset.id)))
    
    # Total Value
    total_value = await db.scalar(select(func.sum(Asset.purchase_price)))
    
    # Status Counts
    # Group by status name
    status_counts_res = await db.execute(
        select(AssetStatus.name, func.count(Asset.id))
        .join(Asset.status)
        .group_by(AssetStatus.name)
    )
    status_counts = {name: count for name, count in status_counts_res.all()}
    
    # Type Counts
    type_counts_res = await db.execute(
        select(AssetType.name, func.count(Asset.id))
        .join(Asset.asset_type)
        .group_by(AssetType.name)
    )
    type_counts = {name: count for name, count in type_counts_res.all()}

    # Location Counts
    location_counts_res = await db.execute(
        select(Asset.location, func.count(Asset.id))
        .group_by(Asset.location)
    )
    # Filter out None locations if desired, or keep as "Unknown"
    location_counts = {loc or "Unknown": count for loc, count in location_counts_res.all()}

    # Request Counts
    request_counts_res = await db.execute(
        select(Request.status, func.count(Request.id))
        .group_by(Request.status)
    )
    req_counts_raw = {
        (status.value if hasattr(status, "value") else str(status)): count 
        for status, count in request_counts_res.all()
    }
    request_stats = {
        "open": req_counts_raw.get("open", 0),
        "in_progress": req_counts_raw.get("in_progress", 0),
        "total": sum(req_counts_raw.values())
    }

    # Recent Assets
    recent_assets_res = await db.execute(
        select(Asset)
        .options(selectinload(Asset.asset_type)) # Eager load type
        .order_by(desc(Asset.created_at))
        .limit(5)
    )
    recent_assets_objs = recent_assets_res.scalars().all()
    recent_assets = []
    for asset in recent_assets_objs:
        recent_assets.append({
            "id": str(asset.id),
            "name": asset.name,
            "type": asset.asset_type.name if asset.asset_type else "Unknown",
            "created_at": asset.created_at
        })

    # Recent Activity (Audit Logs)
    TargetUser = aliased(User)
    
    stmt = (
        select(
            AuditLog,
            User.full_name.label("user_name"),
            case(
                (AuditLog.entity_type == "asset", Asset.name),
                (AuditLog.entity_type == "user", TargetUser.full_name),
                else_=cast(AuditLog.entity_id, String)
            ).label("entity_name")
        )
        .outerjoin(User, AuditLog.user_id == User.id)
        .outerjoin(Asset, (AuditLog.entity_type == "asset") & (AuditLog.entity_id == cast(Asset.id, String)))
        .outerjoin(TargetUser, (AuditLog.entity_type == "user") & (AuditLog.entity_id == cast(TargetUser.id, String)))
        .order_by(desc(AuditLog.timestamp))
        .limit(5)
    )
    
    recent_logs_res = await db.execute(stmt)
    rows = recent_logs_res.all()
    
    formatted_logs = []
    for row in rows:
        log = row[0]
        formatted_logs.append({
            "id": str(log.id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id),
            "timestamp": log.timestamp,
            "user_name": row.user_name or "System",
            "entity_name": row.entity_name,
            "changes": log.changes,
            "origin": log.origin
        })

    return {
        "total_assets": total_assets,
        "total_value": total_value or 0,
        "status_counts": status_counts,
        "type_counts": type_counts,
        "location_counts": location_counts,
        "request_stats": request_stats,
        "recent_assets": recent_assets,
        "recent_activity": formatted_logs
    }


