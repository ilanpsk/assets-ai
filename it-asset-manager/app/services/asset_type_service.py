from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.asset_type import AssetType
from app.models.audit_log import AuditLog
from app.schemas.asset_type import AssetTypeCreate, AssetTypeUpdate
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound, DuplicateResource, ValidationException

@log_activity
async def list_asset_types(db: AsyncSession) -> List[AssetType]:
    res = await db.execute(select(AssetType))
    return res.scalars().all()

@log_activity
async def get_asset_type(db: AsyncSession, type_id: UUID) -> AssetType:
    res = await db.execute(select(AssetType).where(AssetType.id == type_id))
    obj = res.scalar_one_or_none()
    if not obj:
        raise ResourceNotFound(f"Asset Type with id {type_id} not found")
    return obj

@log_activity
async def create_asset_type(db: AsyncSession, data: AssetTypeCreate, operator_id: UUID | None = None) -> AssetType:
    # Check for duplicate name
    res = await db.execute(select(AssetType).where(AssetType.name == data.name))
    if res.scalar_one_or_none():
        raise DuplicateResource("Asset Type name already exists")

    obj = AssetType(**data.model_dump())
    db.add(obj)
    await db.flush() # Ensure ID is generated
    
    # Audit Log
    log = AuditLog(
        entity_type="asset_type",
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
async def update_asset_type(db: AsyncSession, type_id: UUID, data: AssetTypeUpdate, operator_id: UUID | None = None) -> AssetType:
    obj = await get_asset_type(db, type_id)
    # get_asset_type raises ResourceNotFound
    
    changes = data.model_dump(exclude_unset=True, mode="json")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    
    if changes:
        log = AuditLog(
            entity_type="asset_type",
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
async def delete_asset_type(db: AsyncSession, type_id: UUID, operator_id: UUID | None = None) -> bool:
    obj = await get_asset_type(db, type_id)
    # get_asset_type raises ResourceNotFound
    
    # Check for usage
    from app.models.asset import Asset
    res = await db.execute(select(Asset).where(Asset.asset_type_id == type_id).limit(1))
    if res.scalar_one_or_none():
        raise ValidationException("Cannot delete Asset Type because it is in use by one or more assets.")
    
    # Audit Log
    log = AuditLog(
        entity_type="asset_type",
        entity_id=str(obj.id),
        action="delete",
        changes={},
        user_id=operator_id,
    )
    db.add(log)
    
    await db.delete(obj)
    await db.commit()
    return True
