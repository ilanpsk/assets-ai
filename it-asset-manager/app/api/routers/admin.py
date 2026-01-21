from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.deps import require_role
from app.core.db import get_db
from app.schemas.role import RoleName
from app.core.logging import log_activity
from app.schemas.system_setting import SystemSettingRead, SystemSettingUpdate
from app.services import system_setting_service

router = APIRouter()

@router.get("/")
@log_activity
async def admin_dashboard(
    current_user=Depends(require_role(RoleName.admin))
):
    return {"status": "ok"}

@router.get("/settings", response_model=List[SystemSettingRead])
@log_activity
async def get_system_settings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.admin))
):
    return await system_setting_service.get_all_settings(db)

@router.put("/settings/{key}", response_model=SystemSettingRead)
@log_activity
async def update_system_setting(
    key: str,
    payload: SystemSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(RoleName.admin))
):
    return await system_setting_service.update_setting(
        db, key, payload, user_id=current_user.id
    )
