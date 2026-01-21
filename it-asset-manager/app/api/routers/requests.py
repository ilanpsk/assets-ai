from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission, get_current_user
from app.schemas.request import RequestRead, RequestCreate, RequestUpdate
from app.schemas.role import RoleName
from app.services import request_service
from app.core.logging import log_activity
from app.core.exceptions import PermissionDenied

router = APIRouter()

@router.get("/", response_model=List[RequestRead])
@log_activity
async def list_requests(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    status: Optional[str] = Query(None),
    request_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("request:read")),
):
    requester_id = None
    # If user does NOT have view_all, limit to own requests
    if not current_user.has_permission("request:view_all"):
        requester_id = current_user.id
        
    items, total = await request_service.list_requests(
        db, 
        requester_id=requester_id,
        skip=skip,
        limit=limit,
        status=status,
        request_type=request_type,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    
    response.headers["X-Total-Count"] = str(total)
    return items

@router.post("/", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_request(
    payload: RequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("request:create")), 
):
    return await request_service.create_request(db, payload, requester_id=current_user.id)

@router.get("/{request_id}", response_model=RequestRead)
@log_activity
async def get_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    obj = await request_service.get_request(db, request_id)
    # Service raises ResourceNotFound if not found.
    
    # Allow requester or if user has view_all permission (implied by role logic usually, but let's be explicit)
    # Actually request:read + ownership OR request:view_all
    
    if current_user.id != obj.requester_id:
        if not current_user.has_permission("request:view_all"):
             raise PermissionDenied("Not authorized")
             
    return obj

@router.patch("/{request_id}", response_model=RequestRead)
@log_activity
async def update_request(
    request_id: UUID,
    payload: RequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("request:update")),
):
    return await request_service.update_request(db, request_id, payload)

@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("request:update")), # Admin or IT
):
    await request_service.delete_request(db, request_id)
    return None
