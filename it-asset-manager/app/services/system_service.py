from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.role import Role, Permission
from app.models.asset_type import AssetType
from app.models.asset_status import AssetStatus
from app.core.security import hash_password
from app.schemas.role import RoleName
from app.schemas.system import SetupRequest
from app.core.exceptions import ValidationException
from app.core.logging import log_activity
import logging

logger = logging.getLogger("app.service.system")

async def get_system_initialization_status(db: AsyncSession) -> bool:
    """Check if the system has been initialized (i.e., has at least one user)."""
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    return user is not None

async def setup_system(db: AsyncSession, payload: SetupRequest) -> Dict[str, str]:
    """
    Initialize the system with an admin user and optional seed data.
    Securely handles password hashing and initialization checks.
    """
    logger.info(f"Attempting system setup for email: {payload.admin_email}")

    # 1. Check if already initialized
    if await get_system_initialization_status(db):
        logger.warning("System setup failed: Already initialized")
        raise ValidationException("System is already initialized")

    # 2. Create Admin Role (if not exists)
    admin_role_query = await db.execute(select(Role).where(Role.name == RoleName.admin))
    admin_role = admin_role_query.scalar_one_or_none()
    
    if not admin_role:
        logger.info("Creating default Admin role")
        # Fetch all permissions for admin
        all_perms_res = await db.execute(select(Permission))
        all_perms = all_perms_res.scalars().all()
        
        admin_role = Role(
            name=RoleName.admin,
            description="Administrator with full access",
            permissions=all_perms
        )
        db.add(admin_role)
        await db.flush()

    # 3. Create Admin User
    logger.info("Creating Admin user")
    admin_user = User(
        email=payload.admin_email,
        full_name=payload.admin_full_name,
        hashed_password=hash_password(payload.admin_password),
        is_active=True,
        roles=[admin_role]
    )
    db.add(admin_user)
    
    # 4. Seed Data if requested
    if payload.seed_data:
        logger.info("Seeding default data (Asset Types and Statuses)")
        # Seed Asset Types
        types = ["General"]
        for t_name in types:
            existing_type = await db.execute(select(AssetType).where(AssetType.name == t_name))
            if not existing_type.scalar_one_or_none():
                db.add(AssetType(name=t_name, description=f"Standard {t_name}"))

        # Seed Asset Statuses
        statuses = ["General"]
        for s_name in statuses:
             existing_status = await db.execute(select(AssetStatus).where(AssetStatus.name == s_name))
             if not existing_status.scalar_one_or_none():
                 db.add(AssetStatus(name=s_name, description=f"Asset is {s_name}"))

    await db.commit()
    logger.info("System setup completed successfully")
    return {"message": "System setup complete"}

