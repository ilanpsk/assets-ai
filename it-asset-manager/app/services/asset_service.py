from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, cast, String
from sqlalchemy.orm import joinedload
from uuid import UUID
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.asset import Asset
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.asset_set import AssetSet
from app.schemas.asset import AssetCreate, AssetUpdate
from app.core.exceptions import ResourceNotFound, DuplicateResource, ValidationException
from pydantic import ValidationError

from app.core.logging import log_activity

@log_activity
async def list_assets(
    db: AsyncSession,
    page: int = 1,
    size: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    search: Optional[str] = None,
    asset_set_id: Optional[UUID] = None,
    assigned_user_id: Optional[UUID] = None,
    status_id: Optional[UUID] = None,
    asset_type_id: Optional[UUID] = None,
    unassigned_set: bool = False,
    created_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None
) -> Dict[str, Any]:
    query = select(Asset).outerjoin(User, Asset.assigned_user_id == User.id)

    # Filters
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Asset.name.ilike(search_filter)) |
            (Asset.serial_number.ilike(search_filter)) |
            (Asset.location.ilike(search_filter)) |
            (cast(Asset.id, String).ilike(search_filter)) |
            (User.full_name.ilike(search_filter)) |
            (User.email.ilike(search_filter))
        )
    
    if created_after:
        query = query.where(Asset.created_at >= created_after)
    if created_before:
        query = query.where(Asset.created_at <= created_before)
    
    if unassigned_set:
        query = query.where(Asset.asset_set_id == None)
    elif asset_set_id:
        query = query.where(Asset.asset_set_id == asset_set_id)
        
    if assigned_user_id:
        query = query.where(Asset.assigned_user_id == assigned_user_id)

    if status_id:
        query = query.where(Asset.status_id == status_id)
        
    if asset_type_id:
        query = query.where(Asset.asset_type_id == asset_type_id)

    # Count
    # Efficient count using subquery or separate query
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Sort
    if sort_by and hasattr(Asset, sort_by):
        col = getattr(Asset, sort_by)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(col))
        else:
            query = query.order_by(asc(col))
    else:
        query = query.order_by(desc(Asset.created_at))

    # Pagination
    query = query.limit(size).offset((page - 1) * size)
    
    # Eager load
    query = query.options(
        joinedload(Asset.status),
        joinedload(Asset.asset_type),
        joinedload(Asset.asset_set),
        joinedload(Asset.assigned_user)
    )
    
    res = await db.execute(query)
    items = res.scalars().all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

@log_activity
async def create_asset(db: AsyncSession, data: AssetCreate, user_id: UUID | None = None) -> Asset:
    # Validate status and get ID
    status_id = None
    if data.status:
        res = await db.execute(select(AssetStatus).where(AssetStatus.name == data.status))
        status_obj = res.scalar_one_or_none()
        if not status_obj:
            # For robustness, if status doesn't exist, default to active or log warning?
            # Strict mode: raise error.
            raise ValidationException(f"Invalid status: {data.status}")
        status_id = status_obj.id

    # Check for duplicate serial number
    if data.serial_number:
        res = await db.execute(select(Asset).where(Asset.serial_number == data.serial_number))
        if res.scalar_one_or_none():
            raise DuplicateResource(f"Asset with serial number '{data.serial_number}' already exists")

    asset_data = data.model_dump()
    # Remove status string (which is a relationship on the model) and set status_id
    if "status" in asset_data:
        del asset_data["status"]
    if status_id:
        asset_data["status_id"] = status_id

    asset = Asset(**asset_data)
    db.add(asset)
    await db.flush() # Populate ID

    # Audit Log (create in same transaction scope)
    log = AuditLog(
        entity_type="asset",
        entity_id=str(asset.id),
        action="create",
        changes=data.model_dump(mode="json"),
        user_id=user_id,
    )
    db.add(log)

    # Log for User if assigned on creation
    if asset.assigned_user_id:
        user_log = AuditLog(
            entity_type="user",
            entity_id=str(asset.assigned_user_id),
            action="asset_assigned",
            changes={"asset_id": str(asset.id), "asset_name": asset.name},
            user_id=user_id
        )
        db.add(user_log)
    
    await db.commit()
    
    # Reload asset with status relation eager-loaded for Pydantic serialization
    res = await db.execute(select(Asset).options(
        joinedload(Asset.status),
        joinedload(Asset.asset_type),
        joinedload(Asset.asset_set),
        joinedload(Asset.assigned_user)
    ).where(Asset.id == asset.id))
    asset = res.scalar_one()

    return asset

@log_activity
async def bulk_create_assets(db: AsyncSession, assets_data: List[Dict[str, Any]], user_id: UUID | None = None) -> Dict[str, Any]:
    """
    Bulk create assets with validation.
    Returns a report of successes and failures.
    """
    created_count = 0
    errors = []
    
    # Fetch valid statuses map to avoid N+1
    res = await db.execute(select(AssetStatus))
    status_map = {s.name: s.id for s in res.scalars().all()}
    
    for index, item in enumerate(assets_data):
        row_num = index + 1
        # Use a nested transaction (savepoint) for each item
        try:
            async with db.begin_nested():
                # 1. Validate with Pydantic
                asset_schema = AssetCreate(**item)
                
                asset_dict = asset_schema.model_dump()
                status_name = asset_dict.pop("status", None)

                # 2. Validate and Map Status
                if status_name:
                    if status_name not in status_map:
                         # If status map is empty/missing, this will raise.
                         raise ValueError(f"Invalid status '{status_name}'. Valid: {list(status_map.keys())}")
                    asset_dict["status_id"] = status_map[status_name]

                # 3. Check duplicate serial (optimize this for bulk later if needed)
                if asset_schema.serial_number:
                     # Check DB
                     res = await db.execute(select(Asset).where(Asset.serial_number == asset_schema.serial_number))
                     if res.scalar_one_or_none():
                         raise ValueError(f"Duplicate serial number '{asset_schema.serial_number}'")

                # 4. Create Model
                asset = Asset(**asset_dict)
                db.add(asset)
                await db.flush() # Flush inside savepoint to catch DB errors
                
                # 5. Audit Log
                log = AuditLog(
                    entity_type="asset",
                    entity_id=str(asset.id),
                    action="create",
                    changes=asset_schema.model_dump(mode="json"),
                    user_id=user_id,
                )
                db.add(log)
                
                created_count += 1

        except ValidationError as e:
            errors.append(f"Row {row_num}: Validation Error - {e}")
        except ValueError as e:
            errors.append(f"Row {row_num}: {str(e)}")
        except Exception as e:
             # This is a bulk operation catch-all for individual row failures
             # We log it but continue processing other rows
             import logging
             logger = logging.getLogger("app.services.asset")
             logger.error(f"Bulk create asset row {row_num} failed: {str(e)}", exc_info=True)
             errors.append(f"Row {row_num}: Unexpected Error - {str(e)}")
    
    # Commit whatever succeeded (the nested transactions were already 'committed' to the session, 
    # but we need to commit the session itself to persist changes)
    if created_count > 0:
        await db.commit()

    return {
        "created": created_count,
        "errors": errors,
        "total": len(assets_data)
    }

@log_activity
async def get_asset(db: AsyncSession, asset_id: UUID) -> Asset:
    res = await db.execute(select(Asset).options(
        joinedload(Asset.status),
        joinedload(Asset.asset_type),
        joinedload(Asset.asset_set),
        joinedload(Asset.assigned_user)
    ).where(Asset.id == asset_id))
    asset = res.scalar_one_or_none()
    if not asset:
        raise ResourceNotFound(f"Asset with id {asset_id} not found")
    return asset

@log_activity
async def update_asset(db: AsyncSession, asset_id: UUID, data: AssetUpdate, user_id: UUID | None = None) -> Asset:
    asset = await get_asset(db, asset_id)
    # Capture old state for audit logging
    old_assigned_user_id = asset.assigned_user_id

    # get_asset raises if not found, so no check needed here if we assume get_asset raises.
    # However, get_asset implementation above was just changed to raise.
    
    changes = data.model_dump(exclude_unset=True)
    
    # Validate status if changing
    if "status" in changes:
        status_name = changes.pop("status")
        res = await db.execute(select(AssetStatus).where(AssetStatus.name == status_name))
        status_obj = res.scalar_one_or_none()
        if not status_obj:
            raise ValidationException(f"Invalid status: {status_name}")
        changes["status_id"] = status_obj.id

    # Check for duplicate serial number if changing
    if "serial_number" in changes and changes["serial_number"]:
        res = await db.execute(select(Asset).where(Asset.serial_number == changes["serial_number"], Asset.id != asset_id))
        if res.scalar_one_or_none():
            raise DuplicateResource(f"Asset with serial number '{changes['serial_number']}' already exists")

    for field, value in changes.items():
        setattr(asset, field, value)
    
    await db.commit()
    
    # Reload with status eager-loaded
    res = await db.execute(select(Asset).options(
        joinedload(Asset.status),
        joinedload(Asset.asset_type),
        joinedload(Asset.asset_set),
        joinedload(Asset.assigned_user)
    ).where(Asset.id == asset_id))
    asset = res.scalar_one()

    # Audit Log
    if changes:
        # Create audit log for the Asset
        log = AuditLog(
            entity_type="asset",
            entity_id=str(asset.id),
            action="update",
            changes=changes, 
            user_id=user_id,
        )
        log.changes = data.model_dump(exclude_unset=True, mode="json")
        db.add(log)
        
        # Also create an audit log for the User if assigned_user_id changed
        if "assigned_user_id" in changes:
            new_user_id = changes["assigned_user_id"]
            
            # Log for the NEW user (asset assigned)
            if new_user_id:
                user_log = AuditLog(
                    entity_type="user",
                    entity_id=str(new_user_id),
                    action="asset_assigned",
                    changes={"asset_id": str(asset.id), "asset_name": asset.name},
                    user_id=user_id
                )
                db.add(user_log)
            
            # Log for the OLD user (asset unassigned)
            if old_assigned_user_id and old_assigned_user_id != new_user_id:
                user_log_old = AuditLog(
                    entity_type="user",
                    entity_id=str(old_assigned_user_id),
                    action="asset_unassigned",
                    changes={"asset_id": str(asset.id), "asset_name": asset.name},
                    user_id=user_id
                )
                db.add(user_log_old)
        
        await db.commit()
        # Note: asset is expired after commit, but we already have it in memory.
        # However, if Pydantic accesses unloaded relationships, it will fail.
        # But we reloaded 'status' above. Wait, after db.commit(), 'asset' is expired again.
        # So we must reload AFTER the final commit.
        
        # Reload again
        res = await db.execute(select(Asset).options(
            joinedload(Asset.status),
            joinedload(Asset.asset_type),
            joinedload(Asset.asset_set),
            joinedload(Asset.assigned_user)
        ).where(Asset.id == asset_id))
        asset = res.scalar_one()

    return asset

@log_activity
async def delete_asset(db: AsyncSession, asset_id: UUID, user_id: UUID | None = None) -> bool:
    asset = await get_asset(db, asset_id)
    # get_asset raises if not found
    
    # Audit Log
    log = AuditLog(
        entity_type="asset",
        entity_id=str(asset.id),
        action="delete",
        changes={"name": asset.name, "serial": asset.serial_number},
        user_id=user_id,
    )
    db.add(log)
    
    # If assigned to a user, log that assignment removal too
    if asset.assigned_user_id:
        user_log = AuditLog(
            entity_type="user",
            entity_id=str(asset.assigned_user_id),
            action="asset_unassigned",
            changes={"asset_id": str(asset.id), "asset_name": asset.name},
            user_id=user_id
        )
        db.add(user_log)

    await db.delete(asset)
    await db.commit()
    return True

@log_activity
async def bulk_delete_assets(db: AsyncSession, asset_ids: List[UUID] | None = None, asset_set_id: UUID | None = None, user_id: UUID | None = None) -> int:
    """
    Bulk delete assets by IDs or by Asset Set ID.
    Returns the number of assets deleted.
    """
    if not asset_ids and not asset_set_id:
        return 0

    query = select(Asset)
    
    if asset_ids:
        query = query.where(Asset.id.in_(asset_ids))
    elif asset_set_id:
        query = query.where(Asset.asset_set_id == asset_set_id)
    
    # Eager load assigned user for audit logging purposes before deletion
    query = query.options(joinedload(Asset.assigned_user))
    
    res = await db.execute(query)
    assets = res.scalars().all()
    
    if not assets:
        return 0

    count = 0
    for asset in assets:
        # Audit Log
        log = AuditLog(
            entity_type="asset",
            entity_id=str(asset.id),
            action="delete",
            changes={"name": asset.name, "serial": asset.serial_number},
            user_id=user_id,
        )
        db.add(log)
        
        # If assigned to a user, log that assignment removal too
        if asset.assigned_user_id:
            user_log = AuditLog(
                entity_type="user",
                entity_id=str(asset.assigned_user_id),
                action="asset_unassigned",
                changes={"asset_id": str(asset.id), "asset_name": asset.name},
                user_id=user_id
            )
            db.add(user_log)

        await db.delete(asset)
        count += 1

    await db.commit()
    return count
