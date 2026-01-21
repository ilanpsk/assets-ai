from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.models.request import Request
from app.models.asset import Asset
from app.models.user import User
from app.schemas.request import RequestCreate, RequestUpdate
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound

@log_activity
async def list_requests(
    db: AsyncSession, 
    requester_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None
) -> Tuple[List[Request], int]:
    
    # Base query
    stmt = select(Request)
    
    # Filters
    if requester_id:
        stmt = stmt.where(Request.requester_id == requester_id)
        
    if status:
        stmt = stmt.where(Request.status == status)
        
    if request_type:
        stmt = stmt.where(Request.request_type == request_type)
        
    if start_date:
        stmt = stmt.where(Request.created_at >= start_date)
        
    if end_date:
        stmt = stmt.where(Request.created_at <= end_date)
        
    if search:
        search_lower = f"%{search.lower()}%"
        # Join requester to search by name/email if needed, but simple search first
        # We need to join user if we want to search by requester name
        stmt = stmt.outerjoin(Request.requester)
        stmt = stmt.where(
            or_(
                func.lower(Request.title).like(search_lower),
                func.lower(Request.description).like(search_lower),
                func.lower(User.full_name).like(search_lower),
                func.lower(User.email).like(search_lower)
            )
        )

    # Count total matches before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    # Apply options and pagination
    stmt = stmt.options(
        selectinload(Request.requester), 
        selectinload(Request.asset).selectinload(Asset.asset_type),
        selectinload(Request.asset).selectinload(Asset.status),
        selectinload(Request.asset).selectinload(Asset.asset_set),
        selectinload(Request.asset).selectinload(Asset.assigned_user)
    )
    
    # Order by created_at desc
    stmt = stmt.order_by(Request.created_at.desc())
    stmt = stmt.offset(skip).limit(limit)
    
    res = await db.execute(stmt)
    return res.scalars().all(), total

@log_activity
async def get_request(db: AsyncSession, request_id: UUID) -> Request:
    res = await db.execute(
        select(Request)
        .options(
            selectinload(Request.requester), 
            selectinload(Request.asset).selectinload(Asset.asset_type),
            selectinload(Request.asset).selectinload(Asset.status),
            selectinload(Request.asset).selectinload(Asset.asset_set),
            selectinload(Request.asset).selectinload(Asset.assigned_user)
        )
        .where(Request.id == request_id)
    )
    obj = res.scalar_one_or_none()
    if not obj:
        raise ResourceNotFound(f"Request with id {request_id} not found")
    return obj

@log_activity
async def create_request(db: AsyncSession, data: RequestCreate, requester_id: UUID) -> Request:
    obj = Request(**data.model_dump(), requester_id=requester_id)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    # Need to reload to get requester if we return it immediately, 
    # but often frontend just redirects. 
    # Let's ensure consistency if needed.
    return await get_request(db, obj.id)

@log_activity
async def update_request(db: AsyncSession, request_id: UUID, data: RequestUpdate) -> Request:
    obj = await get_request(db, request_id)
    # get_request raises ResourceNotFound
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    
    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def delete_request(db: AsyncSession, request_id: UUID) -> bool:
    obj = await get_request(db, request_id)
    # get_request raises ResourceNotFound
    await db.delete(obj)
    await db.commit()
    return True
