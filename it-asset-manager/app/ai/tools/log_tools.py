from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
import logging
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, cast, String, desc
from sqlalchemy.orm import aliased
from typing import Callable

from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.asset import Asset

class SearchLogsInput(BaseModel):
    query: Optional[str] = Field(default=None, description="Text search across action, entity type, and changes")
    entity_type: Optional[str] = Field(default=None, description="Filter by entity type (e.g. 'asset', 'user')")
    entity_id: Optional[str] = Field(default=None, description="Filter by specific entity ID")
    user_id: Optional[UUID] = Field(default=None, description="Filter by actor (user who performed the action)")
    start_date: Optional[datetime] = Field(default=None, description="Filter logs after this date")
    end_date: Optional[datetime] = Field(default=None, description="Filter logs before this date")
    limit: int = Field(default=20, description="Max number of logs to return")

def get_log_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    
    logger = logging.getLogger("app.ai.tools.log")

    async def _search_logs(
        query: str = None, 
        entity_type: str = None, 
        entity_id: str = None, 
        user_id: UUID = None, 
        start_date: datetime = None, 
        end_date: datetime = None,
        limit: int = 20
    ) -> str:
        async with session_factory() as db:
            try:
                TargetUser = aliased(User)
                stmt = select(
                    AuditLog,
                    User.full_name.label("user_name"),
                    Asset.name.label("asset_name"), # Simple join for asset name
                    TargetUser.full_name.label("target_user_name") # Simple join for target user
                ).outerjoin(User, AuditLog.user_id == User.id) \
                 .outerjoin(Asset, (AuditLog.entity_type == "asset") & (AuditLog.entity_id == cast(Asset.id, String))) \
                 .outerjoin(TargetUser, (AuditLog.entity_type == "user") & (AuditLog.entity_id == cast(TargetUser.id, String)))

                if query:
                    pattern = f"%{query}%"
                    stmt = stmt.where(
                        or_(
                            AuditLog.action.ilike(pattern),
                            AuditLog.entity_type.ilike(pattern),
                            cast(AuditLog.changes, String).ilike(pattern)
                        )
                    )
                
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
                
                stmt = stmt.order_by(desc(AuditLog.timestamp)).limit(limit)
                
                res = await db.execute(stmt)
                rows = res.all()
                
                results = []
                for row in rows:
                    log = row[0]
                    entity_name = str(log.entity_id)
                    if log.entity_type == "asset" and row.asset_name:
                        entity_name = row.asset_name
                    elif log.entity_type == "user" and row.target_user_name:
                        entity_name = row.target_user_name
                        
                    results.append({
                        "action": log.action,
                        "type": log.entity_type,
                        "entity": entity_name,
                        "actor": row.user_name or "System",
                        "time": str(log.timestamp),
                        "changes": log.changes
                    })
                
                if not results:
                    return "No logs found matching criteria."
                
                return str(results)

            except Exception as e:
                logger.error(f"Search logs failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    # Only IT and Admin can search logs
    if user.has_role("admin") or user.has_role("it") or user.has_permission("audit:read"):
        return [
            StructuredTool.from_function(
                coroutine=_search_logs,
                name="search_audit_logs",
                description="Search audit logs to investigate history. Use this to answer 'when did X happen', 'who updated Y', or find specific events.",
                args_schema=SearchLogsInput
            )
        ]
    
    return []

