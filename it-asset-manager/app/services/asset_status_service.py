from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.asset_status import AssetStatus
from app.models.audit_log import AuditLog
from app.schemas.asset_status import AssetStatusCreate, AssetStatusRead, AssetStatusUpdate
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound, DuplicateResource, ValidationException

@log_activity
async def list_asset_statuses(db: AsyncSession) -> List[AssetStatus]:
    res = await db.execute(select(AssetStatus))
    return res.scalars().all()

@log_activity
async def get_asset_status(db: AsyncSession, key: str) -> AssetStatus:
    res = await db.execute(select(AssetStatus).where(AssetStatus.name == key))
    obj = res.scalar_one_or_none()
    if not obj:
         raise ResourceNotFound(f"Asset status with key '{key}' not found")
    return obj

@log_activity
async def create_asset_status(db: AsyncSession, data: AssetStatusCreate, operator_id: UUID | None = None) -> AssetStatus:
    res = await db.execute(select(AssetStatus).where(AssetStatus.name == data.key))
    if res.scalar_one_or_none():
        raise DuplicateResource("Status key already exists")
    
    # Map schema fields to model fields if they differ
    model_data = data.model_dump()
    model_data["name"] = model_data.pop("key") # schema uses key, model uses name
    if "label" in model_data:
        model_data["description"] = model_data.pop("label")
    
    # Remove is_system if it exists in schema but not in model
    if "is_system" in model_data:
        model_data.pop("is_system")

    obj = AssetStatus(**model_data)
    db.add(obj)
    await db.flush()
    
    # Audit Log
    log = AuditLog(
        entity_type="asset_status",
        entity_id=str(obj.id),
        action="create",
        changes=data.model_dump(mode="json"),
        user_id=operator_id,
    )
    db.add(log)

    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def update_asset_status(db: AsyncSession, key: str, data: AssetStatusUpdate, operator_id: UUID | None = None) -> AssetStatus:
    obj = await get_asset_status(db, key)
    
    if obj.is_default:
        # Optionally restrict editing default statuses entirely, or just the key?
        # Assuming we allow editing description/label but not key/name if it was mutable (here key is used as ID lookup so it's tricky)
        pass

    changes = data.model_dump(exclude_unset=True, mode="json")
    
    # Map fields
    if "label" in changes:
        obj.description = changes.pop("label")
    
    # If we supported renaming keys, we'd handle 'key' -> 'name' here, but usually keys are immutable IDs
    
    if changes:
        log = AuditLog(
            entity_type="asset_status",
            entity_id=str(obj.id),
            action="update",
            changes=changes,
            user_id=operator_id,
        )
        db.add(log)

    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def delete_asset_status(db: AsyncSession, key: str, operator_id: UUID | None = None) -> bool:
    obj = await get_asset_status(db, key)
    # get_asset_status raises ResourceNotFound
    
    if obj.is_default: 
        raise ValidationException("Cannot delete default status")
    
    # Audit Log
    log = AuditLog(
        entity_type="asset_status",
        entity_id=str(obj.id),
        action="delete",
        changes={},
        user_id=operator_id,
    )
    db.add(log)

    await db.delete(obj)
    await db.commit()
    return True
