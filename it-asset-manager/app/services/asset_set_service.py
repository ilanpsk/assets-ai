from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from app.models.asset_set import AssetSet
from app.models.audit_log import AuditLog
from app.schemas.asset_set import AssetSetCreate, AssetSetUpdate
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound, DuplicateResource

@log_activity
async def list_asset_sets(db: AsyncSession) -> List[AssetSet]:
    res = await db.execute(select(AssetSet))
    return res.scalars().all()

@log_activity
async def get_asset_set(db: AsyncSession, set_id: UUID) -> AssetSet:
    res = await db.execute(select(AssetSet).where(AssetSet.id == set_id))
    obj = res.scalar_one_or_none()
    if not obj:
        raise ResourceNotFound(f"Asset set with id {set_id} not found")
    return obj

@log_activity
async def create_asset_set(db: AsyncSession, data: AssetSetCreate, user_id: UUID | None = None) -> AssetSet:
    # Check duplicate name? Optional but good practice
    res = await db.execute(select(AssetSet).where(AssetSet.name == data.name))
    if res.scalar_one_or_none():
        raise DuplicateResource(f"Asset set with name '{data.name}' already exists")

    obj = AssetSet(**data.model_dump(), created_by_id=user_id)
    db.add(obj)
    await db.flush()
    
    # Audit Log
    log = AuditLog(
        entity_type="asset_set",
        entity_id=str(obj.id),
        action="create",
        changes=data.model_dump(mode="json"),
        user_id=user_id,
    )
    db.add(log)

    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def update_asset_set(db: AsyncSession, set_id: UUID, data: AssetSetUpdate, user_id: UUID | None = None) -> AssetSet:
    obj = await get_asset_set(db, set_id)
    # get_asset_set raises ResourceNotFound
    
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        # Check duplicate name if changing
        res = await db.execute(select(AssetSet).where(AssetSet.name == changes["name"], AssetSet.id != set_id))
        if res.scalar_one_or_none():
            raise DuplicateResource(f"Asset set with name '{changes['name']}' already exists")

    for field, value in changes.items():
        setattr(obj, field, value)
    
    if changes:
        log = AuditLog(
            entity_type="asset_set",
            entity_id=str(obj.id),
            action="update",
            changes=changes,
            user_id=user_id,
        )
        db.add(log)

    await db.commit()
    await db.refresh(obj)
    return obj

@log_activity
async def delete_asset_set(db: AsyncSession, set_id: UUID, user_id: UUID | None = None) -> bool:
    obj = await get_asset_set(db, set_id)
    # get_asset_set raises ResourceNotFound
    
    # Note: Deletion might cascade to assets or fields depending on DB config.
    # In models, we used ondelete="SET NULL" for assets, "CASCADE" for fields?
    # Let's trust the DB foreign key configuration for now.
    
    # Audit Log
    log = AuditLog(
        entity_type="asset_set",
        entity_id=str(obj.id),
        action="delete",
        changes={},
        user_id=user_id,
    )
    db.add(log)
    
    await db.delete(obj)
    await db.commit()
    return True
