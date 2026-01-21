from uuid import UUID
from typing import List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from fastapi import HTTPException

from app.models.user import User
from app.models.role import Role
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password
from app.core.logging import log_activity
from app.core.exceptions import ResourceNotFound, DuplicateResource, ValidationException

@log_activity
async def list_users(
    db: AsyncSession, 
    roles: Optional[List[str]] = None,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None
) -> Tuple[List[User], int]:
    stmt = select(User)
    
    if roles:
        stmt = stmt.join(User.roles).where(Role.name.in_(roles))
        
    if search:
        search_lower = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.email).like(search_lower),
                func.lower(User.full_name).like(search_lower)
            )
        )
        
    # Count total matches before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()
    
    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)
    
    res = await db.execute(stmt)
    return res.unique().scalars().all(), total

@log_activity
async def get_user(db: AsyncSession, user_id: UUID) -> User:
    user = await User.get_by_id(db, user_id)
    if not user:
        raise ResourceNotFound(f"User with id {user_id} not found")
    return user

@log_activity
async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    res = await db.execute(select(User).where(User.email == email))
    return res.scalar_one_or_none()

@log_activity
async def create_user(db: AsyncSession, data: UserCreate, operator_id: UUID | None = None) -> User:
    # Check if user exists
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise DuplicateResource("Email already registered")

    # Create User
    user_data = data.model_dump(exclude={"password", "roles"})
    if data.password:
        user_data["hashed_password"] = hash_password(data.password)
    
    user = User(**user_data)
    
    # Assign Roles
    if data.roles:
        # Validate roles
        stmt = select(Role).where(Role.name.in_(data.roles))
        res = await db.execute(stmt)
        valid_roles = res.scalars().all()
        
        if len(valid_roles) != len(data.roles):
            found_names = {r.name for r in valid_roles}
            invalid = set(data.roles) - found_names
            raise ValidationException(f"Invalid roles: {invalid}")
        
        user.roles = valid_roles
    else:
        # Default to 'user' role if exists
        res = await db.execute(select(Role).where(Role.name == "user"))
        default_role = res.scalar_one_or_none()
        if default_role:
            user.roles.append(default_role)

    db.add(user)
    await db.flush()
    
    # Audit Log
    log = AuditLog(
        entity_type="user",
        entity_id=str(user.id),
        action="create",
        changes=data.model_dump(mode="json", exclude={"password"}),
        user_id=operator_id,
    )
    db.add(log)

    await db.commit()
    await db.refresh(user)
    return user

@log_activity
async def update_user(db: AsyncSession, user_id: UUID, data: UserUpdate, operator_id: UUID | None = None) -> User:
    user = await get_user(db, user_id)
    # get_user raises ResourceNotFound if not found

    user_data = data.model_dump(exclude_unset=True, exclude={"password", "roles"})
    for field, value in user_data.items():
        setattr(user, field, value)

    if data.password:
        user.hashed_password = hash_password(data.password)

    # Handle roles update if present
    if data.roles is not None:
        # Validate roles
        stmt = select(Role).where(Role.name.in_(data.roles))
        res = await db.execute(stmt)
        valid_roles = res.scalars().all()
        
        if len(valid_roles) != len(data.roles):
            found_names = {r.name for r in valid_roles}
            invalid = set(data.roles) - found_names
            raise ValidationException(f"Invalid roles: {invalid}")
            
        user.roles = valid_roles

    # Audit Log
    changes = data.model_dump(exclude_unset=True, mode="json", exclude={"password"})
    if changes:
        log = AuditLog(
            entity_type="user",
            entity_id=str(user.id),
            action="update",
            changes=changes,
            user_id=operator_id,
        )
        db.add(log)

    await db.commit()
    await db.refresh(user)
    return user

@log_activity
async def delete_user(db: AsyncSession, user_id: UUID, operator_id: UUID | None = None) -> bool:
    user = await get_user(db, user_id)
    # get_user raises ResourceNotFound if not found
    
    # Audit Log
    log = AuditLog(
        entity_type="user",
        entity_id=str(user.id),
        action="delete",
        changes={},
        user_id=operator_id,
    )
    db.add(log)
    
    await db.delete(user)
    await db.commit()
    return True
