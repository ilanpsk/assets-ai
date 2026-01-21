from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.role import Role, Permission
from app.models.audit_log import AuditLog
from app.schemas.role import RoleCreate, RoleUpdate
from app.core.exceptions import ResourceNotFound, DuplicateResource
from app.core.logging import log_activity

@log_activity
async def list_roles(db: AsyncSession) -> List[Role]:
    stmt = select(Role).options(selectinload(Role.permissions))
    res = await db.execute(stmt)
    return res.scalars().all()

@log_activity
async def get_role(db: AsyncSession, name: str) -> Role:
    stmt = select(Role).options(selectinload(Role.permissions)).where(Role.name == name)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()
    if not role:
        raise ResourceNotFound(f"Role '{name}' not found")
    return role

@log_activity
async def create_role(db: AsyncSession, data: RoleCreate, operator_id: Optional[UUID] = None) -> Role:
    stmt = select(Role).where(Role.name == data.name)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise DuplicateResource(f"Role '{data.name}' already exists")
    
    role = Role(name=data.name, description=data.description)
    db.add(role)
    
    # Audit Log
    log = AuditLog(
        entity_type="role",
        entity_id=role.name,
        action="create",
        changes=data.model_dump(mode="json"),
        user_id=operator_id,
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(role)
    return role

@log_activity
async def update_role(db: AsyncSession, name: str, data: RoleUpdate, operator_id: Optional[UUID] = None) -> Role:
    role = await get_role(db, name)
    
    changes = {}
    if data.description is not None:
        role.description = data.description
        changes["description"] = data.description
        
    if changes:
        log = AuditLog(
            entity_type="role",
            entity_id=role.name,
            action="update",
            changes=changes,
            user_id=operator_id,
        )
        db.add(log)
        
    await db.commit()
    await db.refresh(role)
    return role

@log_activity
async def delete_role(db: AsyncSession, name: str, operator_id: Optional[UUID] = None) -> bool:
    role = await get_role(db, name)
    
    log = AuditLog(
        entity_type="role",
        entity_id=role.name,
        action="delete",
        changes={},
        user_id=operator_id,
    )
    db.add(log)
    
    await db.delete(role)
    await db.commit()
    return True

@log_activity
async def list_permissions(db: AsyncSession) -> List[Permission]:
    stmt = select(Permission)
    res = await db.execute(stmt)
    return res.scalars().all()

@log_activity
async def assign_permissions(db: AsyncSession, role_name: str, permission_slugs: List[str], operator_id: Optional[UUID] = None) -> Role:
    role = await get_role(db, role_name)
    
    # Get permissions
    stmt = select(Permission).where(Permission.slug.in_(permission_slugs))
    res = await db.execute(stmt)
    perms = res.scalars().all()
    
    if len(perms) != len(permission_slugs):
        found_slugs = {p.slug for p in perms}
        missing = set(permission_slugs) - found_slugs
        raise ResourceNotFound(f"Permissions not found: {missing}")
    
    role.permissions = perms
    
    log = AuditLog(
        entity_type="role",
        entity_id=role.name,
        action="update_permissions",
        changes={"permissions": permission_slugs},
        user_id=operator_id,
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(role)
    return role
