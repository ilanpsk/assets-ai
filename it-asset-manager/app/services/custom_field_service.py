from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.custom_field import CustomFieldDefinition
from app.models.audit_log import AuditLog
from app.schemas.custom_field import CustomFieldDefinitionCreate, CustomFieldDefinitionUpdate
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound, DuplicateResource

@log_activity
async def list_custom_fields(db: AsyncSession) -> List[CustomFieldDefinition]:
    res = await db.execute(select(CustomFieldDefinition))
    return res.scalars().all()

@log_activity
async def get_custom_field(db: AsyncSession, field_id: UUID) -> CustomFieldDefinition:
    res = await db.execute(select(CustomFieldDefinition).where(CustomFieldDefinition.id == field_id))
    obj = res.scalar_one_or_none()
    if not obj:
        raise ResourceNotFound(f"Custom Field with id {field_id} not found")
    return obj

@log_activity
async def create_custom_field(db: AsyncSession, data: CustomFieldDefinitionCreate, operator_id: UUID | None = None) -> CustomFieldDefinition:
    # Check duplicate key within scope (set + type)
    query = select(CustomFieldDefinition).where(
        CustomFieldDefinition.key == data.key,
        CustomFieldDefinition.asset_type_id == data.asset_type_id,
        CustomFieldDefinition.asset_set_id == data.asset_set_id
    )
    res = await db.execute(query)
    if res.scalar_one_or_none():
        raise DuplicateResource(f"Field key '{data.key}' already exists in this scope")
    
    obj = CustomFieldDefinition(**data.model_dump())
    db.add(obj)
    await db.flush()
    
    # Audit Log
    log = AuditLog(
        entity_type="custom_field",
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
async def update_custom_field(db: AsyncSession, field_id: UUID, data: CustomFieldDefinitionUpdate, operator_id: UUID | None = None) -> CustomFieldDefinition:
    obj = await get_custom_field(db, field_id)
    # get_custom_field raises ResourceNotFound
    
    changes = data.model_dump(exclude_unset=True, mode="json")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    
    if changes:
        log = AuditLog(
            entity_type="custom_field",
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
async def delete_custom_field(db: AsyncSession, field_id: UUID, operator_id: UUID | None = None) -> bool:
    obj = await get_custom_field(db, field_id)
    # get_custom_field raises ResourceNotFound
        
    # Audit Log
    log = AuditLog(
        entity_type="custom_field",
        entity_id=str(obj.id),
        action="delete",
        changes={},
        user_id=operator_id,
    )
    db.add(log)
    
    await db.delete(obj)
    await db.commit()
    return True
