import csv
import io
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta

from app.models.asset import Asset
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.asset_status import AssetStatus
from app.models.custom_field import CustomFieldDefinition
from app.core.logging import log_activity

def _escape_csv_value(value: Any) -> str:
    """
    Escapes values starting with =, +, -, @ to prevent Excel formula injection.
    """
    s = str(value) if value is not None else ""
    if s and s.startswith(('=', '+', '-', '@')):
        return "'" + s
    return s

@log_activity
async def generate_csv_export(
    db: AsyncSession,
    entity_type: str,
    fields: List[str],
    filters: Optional[Dict[str, Any]] = None
) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(fields)
    
    if entity_type == "asset":
        stmt = select(Asset).options(
            joinedload(Asset.status),
            joinedload(Asset.asset_type),
            joinedload(Asset.assigned_user),
            joinedload(Asset.asset_set)
        )
        # Apply filters if needed (basic implementation)
        if filters:
             if filters.get("start_date"):
                 stmt = stmt.where(Asset.created_at >= filters["start_date"])
             if filters.get("end_date"):
                 stmt = stmt.where(Asset.created_at <= filters["end_date"])
             if filters.get("status_id"):
                 stmt = stmt.where(Asset.status_id == filters["status_id"])
             if filters.get("asset_type_id"):
                 stmt = stmt.where(Asset.asset_type_id == filters["asset_type_id"])
             if filters.get("asset_set_id"):
                 stmt = stmt.where(Asset.asset_set_id == filters["asset_set_id"])
             
        res = await db.execute(stmt)
        items = res.scalars().all()
        
        for item in items:
            row = []
            for field in fields:
                val = ""
                if field == "status" and item.status:
                    val = item.status.name
                elif field == "asset_type" and item.asset_type:
                    val = item.asset_type.name
                elif field == "assigned_user" and item.assigned_user:
                    val = item.assigned_user.full_name or item.assigned_user.email
                elif field == "asset_set" and item.asset_set:
                    val = item.asset_set.name
                # Handle standard attributes first
                elif hasattr(item, field):
                    val = getattr(item, field)
                    if val is None:
                        val = ""
                # Handle Custom Fields (stored in item.extra)
                elif item.extra and field in item.extra:
                    val = item.extra[field]
                
                row.append(_escape_csv_value(val))
            writer.writerow(row)
            
    elif entity_type == "user":
        stmt = select(User)
        res = await db.execute(stmt)
        items = res.scalars().all()
        
        for item in items:
            row = []
            for field in fields:
                val = getattr(item, field, "")
                if val is None: val = ""
                row.append(_escape_csv_value(val))
            writer.writerow(row)
            
    elif entity_type == "log":
        stmt = select(AuditLog).order_by(AuditLog.timestamp.desc())
        if filters and filters.get("start_date"):
            stmt = stmt.where(AuditLog.timestamp >= filters["start_date"])
        
        res = await db.execute(stmt)
        items = res.scalars().all()
        
        for item in items:
            row = []
            for field in fields:
                val = getattr(item, field, "")
                if val is None: val = ""
                row.append(_escape_csv_value(val))
            writer.writerow(row)

    return output.getvalue()

@log_activity
async def get_log_statistics(db: AsyncSession):
    # 1. Activity Volume (Last 7 days)
    today = datetime.utcnow().date()
    # If today has logs, we want to see them, so we include today.
    # To get 7 days including today, we go back 6 days.
    seven_days_ago = today - timedelta(days=6)
    
    # Generate date series
    dates = [seven_days_ago + timedelta(days=i) for i in range(7)]
    
    # Group by date
    # Cast timestamp to date for grouping
    stmt = (
        select(func.date(AuditLog.timestamp), func.count(AuditLog.id))
        .where(AuditLog.timestamp >= seven_days_ago)
        .group_by(func.date(AuditLog.timestamp))
        .order_by(func.date(AuditLog.timestamp))
    )
    res = await db.execute(stmt)
    # res.all() returns list of (date_obj, count)
    data = {d: c for d, c in res.all()}
    
    activity_volume = []
    for d in dates:
        # Convert to string YYYY-MM-DD for matching if needed, or keep as date object key
        # Depending on driver, 'd' from DB might be a date object or string.
        # Safe comparison:
        count = 0
        for db_date, db_count in data.items():
             if str(db_date) == str(d):
                 count = db_count
                 break
        activity_volume.append({"date": d.strftime("%Y-%m-%d"), "count": count})
    
    # 2. Action Types Distribution
    stmt = (
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
    )
    res = await db.execute(stmt)
    action_types = [{"name": action, "value": count} for action, count in res.all()]
    
    return {
        "activity_volume": activity_volume,
        "action_types": action_types
    }
