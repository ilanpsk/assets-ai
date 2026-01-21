from typing import List, Optional
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, require_permission
from app.schemas.asset import AssetCreate, AssetUpdate, AssetRead, BulkDeleteAssetsRequest, BulkDeleteAssetsResponse
from app.schemas.common import PaginatedResponse
from app.services import asset_service
from app.core.logging import log_activity
from app.core.exceptions import PermissionDenied

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=PaginatedResponse[AssetRead])
@log_activity
async def list_assets(
    page: int = 1,
    size: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: Optional[str] = None,
    asset_set_id: Optional[UUID] = None,
    assigned_user_id: Optional[UUID] = None,
    unassigned_set: bool = False,
    status_id: Optional[UUID] = None,
    asset_type_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("asset:read")),
):
    # Enforce data scoping
    if not current_user.has_permission("asset:view_all"):
        assigned_user_id = current_user.id
        
    # Debug log
    if assigned_user_id:
        logger.debug(f"Filtering assets by assigned_user_id: {assigned_user_id}")
    else:
        logger.debug("No assigned_user_id filter")

    return await asset_service.list_assets(
        db=db,
        page=page,
        size=size,
        sort_by=sort_by,
        sort_order=sort_order,
        search=search,
        asset_set_id=asset_set_id,
        assigned_user_id=assigned_user_id,
        unassigned_set=unassigned_set,
        status_id=status_id,
        asset_type_id=asset_type_id
    )

@router.post("/", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_asset(
    payload: AssetCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("asset:create")),
):
    return await asset_service.create_asset(db, payload, user_id=current_user.id)

@router.post("/bulk-delete", response_model=BulkDeleteAssetsResponse)
@log_activity
async def bulk_delete_assets(
    payload: BulkDeleteAssetsRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("asset:delete")),
):
    count = await asset_service.bulk_delete_assets(db, asset_ids=payload.asset_ids, user_id=current_user.id)
    return BulkDeleteAssetsResponse(deleted_count=count)

@router.get("/{asset_id}", response_model=AssetRead)
@log_activity
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("asset:read")),
):
    asset = await asset_service.get_asset(db, asset_id)
    
    # Enforce scoping
    if not current_user.has_permission("asset:view_all"):
        if asset.assigned_user_id != current_user.id:
            raise PermissionDenied("Not authorized to view this asset")
            
    return asset

@router.patch("/{asset_id}", response_model=AssetRead)
@log_activity
async def update_asset(
    asset_id: UUID,
    payload: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("asset:update")),
):
    return await asset_service.update_asset(db, asset_id, payload, user_id=current_user.id)

@router.delete("/{asset_id}", status_code=204)
@log_activity
async def delete_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("asset:delete")),
):
    await asset_service.delete_asset(db, asset_id, user_id=current_user.id)
    return None
