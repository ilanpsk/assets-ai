from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system_setting import SystemSetting
from app.models.audit_log import AuditLog
from app.schemas.system_setting import SystemSettingUpdate
from app.core.logging import log_activity

@log_activity
async def get_all_settings(db: AsyncSession) -> List[SystemSetting]:
    result = await db.execute(select(SystemSetting))
    return result.scalars().all()

@log_activity
async def get_setting_by_key(db: AsyncSession, key: str) -> Optional[SystemSetting]:
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    return result.scalar_one_or_none()

@log_activity
async def update_setting(
    db: AsyncSession, 
    key: str, 
    data: SystemSettingUpdate, 
    user_id: Optional[UUID] = None
) -> SystemSetting:
    # Check if exists
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    
    action = "update"
    changes = data.model_dump(mode='json', exclude_unset=True)
    
    if not setting:
        action = "create"
        # Create
        setting = SystemSetting(
            key=key, 
            value=data.value, 
            is_secure=data.is_secure or False, 
            description=data.description
        )
        db.add(setting)
        await db.flush() # Populate ID for audit log
    else:
        # Update
        if data.value is not None:
            setting.value = data.value
        if data.description is not None:
            setting.description = data.description
        if data.is_secure is not None:
            setting.is_secure = data.is_secure
            
    # Audit Log
    # Mask value if secure
    log_changes = changes.copy()
    if (setting.is_secure or data.is_secure) and 'value' in log_changes:
        log_changes['value'] = '********'

    log = AuditLog(
        entity_type="system_setting",
        entity_id=str(setting.id),
        action=action,
        changes=log_changes,
        user_id=user_id
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(setting)
    return setting





