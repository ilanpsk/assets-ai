from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_permission
from app.schemas.asset_status import AssetStatusRead, AssetStatusCreate, AssetStatusUpdate
from app.services import asset_status_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/", response_model=List[AssetStatusRead])
@log_activity
async def list_asset_statuses(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:read")),
):
    return await asset_status_service.list_asset_statuses(db)

@router.post("/", response_model=AssetStatusRead, status_code=status.HTTP_201_CREATED)
@log_activity
async def create_asset_status(
    payload: AssetStatusCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await asset_status_service.create_asset_status(db, payload, operator_id=current_user.id)

@router.patch("/{key}", response_model=AssetStatusRead)
@log_activity
async def update_asset_status(
    key: str,
    payload: AssetStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    return await asset_status_service.update_asset_status(db, key, payload, operator_id=current_user.id)

@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
@log_activity
async def delete_asset_status(
    key: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("config:write")),
):
    await asset_status_service.delete_asset_status(db, key, operator_id=current_user.id)
    return None
