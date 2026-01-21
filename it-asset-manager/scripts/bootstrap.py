import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import async_session_factory
from app.core.security import hash_password
from app.models.role import Role, Permission
from app.models.user import User
from app.models.asset_status import AssetStatus
from app.models.asset_set import AssetSet

DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_PASSWORD = "admin123"

PERMISSIONS = {
    "asset:read": "View assets",
    "asset:create": "Create assets",
    "asset:update": "Update assets",
    "asset:delete": "Delete assets",
    "user:read": "View users",
    "user:create": "Create users",
    "user:update": "Update users",
    "user:delete": "Delete users",
    "config:read": "View configurations (types, statuses, fields)",
    "config:write": "Manage configurations",
    "request:read": "View requests",
    "request:create": "Create requests",
    "request:update": "Update requests (approve/deny)",
    "audit:read": "View audit logs",
    "set:read": "View asset sets",
    "set:create": "Create asset sets",
    "set:update": "Update asset sets",
    "set:delete": "Delete asset sets",
}

ROLE_PERMISSIONS = {
    "admin": list(PERMISSIONS.keys()),
    "it": [
        "asset:read", "asset:create", "asset:update", "asset:delete",
        "user:read",
        "config:read", "config:write",
        "request:read", "request:update",
        "audit:read",
        "set:read", "set:create", "set:update", "set:delete"
    ],
    "user": [
        "asset:read",
        "request:create",
        "request:read",
        "set:read"
    ]
}

DEFAULT_STATUSES = [
    {"key": "active", "label": "Active", "is_default": True},
    {"key": "in_stock", "label": "In Stock", "is_default": False},
    {"key": "fix", "label": "Under Repair", "is_default": False},
    {"key": "retired", "label": "Retired", "is_default": False},
    {"key": "lost", "label": "Lost", "is_default": False},
]

DEFAULT_SETS = [
    {"name": "General", "description": "General assets"},
]

async def bootstrap():
    async with async_session_factory() as db:
        # 1. Seed Permissions
        permission_objects = {}
        for slug, desc in PERMISSIONS.items():
            res = await db.execute(select(Permission).where(Permission.slug == slug))
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permission(slug=slug, description=desc)
                db.add(perm)
            permission_objects[slug] = perm
        await db.commit()
        
        # Reload all permissions
        res = await db.execute(select(Permission))
        all_perms = {p.slug: p for p in res.scalars().all()}

        # 2. Seed Roles & Assign Permissions
        for role_name, perm_slugs in ROLE_PERMISSIONS.items():
            res = await db.execute(
                select(Role)
                .options(selectinload(Role.permissions))
                .where(Role.name == role_name)
            )
            role = res.scalar_one_or_none()
            
            target_perms = [all_perms[slug] for slug in perm_slugs if slug in all_perms]
            
            if not role:
                role = Role(name=role_name, permissions=target_perms)
                db.add(role)
            else:
                # Re-assign collection directly
                role.permissions = target_perms
            
        await db.commit()

        # Statuses
        for s in DEFAULT_STATUSES:
            res = await db.execute(select(AssetStatus).where(AssetStatus.name == s["key"]))
            status = res.scalar_one_or_none()
            if not status:
                status = AssetStatus(
                    name=s["key"],
                    description=s["label"],
                    is_default=s["is_default"],
                )
                db.add(status)
        await db.commit()

        # Asset Sets
        for s in DEFAULT_SETS:
            res = await db.execute(select(AssetSet).where(AssetSet.name == s["name"]))
            asset_set = res.scalar_one_or_none()
            if not asset_set:
                asset_set = AssetSet(
                    name=s["name"],
                    description=s["description"],
                )
                db.add(asset_set)
        await db.commit()

        # Admin user
        res = await db.execute(
            select(User)
            .options(selectinload(User.roles))
            .where(User.email == DEFAULT_ADMIN_EMAIL)
        )
        admin = res.scalar_one_or_none()
        
        if not admin:
            # Fetch admin role
            res = await db.execute(select(Role).where(Role.name == "admin"))
            admin_role = res.scalar_one()
            
            admin = User(
                email=DEFAULT_ADMIN_EMAIL,
                full_name="Admin",
                hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
                is_active=True,
                roles=[admin_role]
            )
            db.add(admin)
            await db.commit()
        else:
            has_admin = any(r.name == "admin" for r in admin.roles)
            if not has_admin:
                res = await db.execute(select(Role).where(Role.name == "admin"))
                admin_role = res.scalar_one()
                admin.roles.append(admin_role)
                await db.commit()

    print(f"Bootstrap complete. Admin user: {DEFAULT_ADMIN_EMAIL} / {DEFAULT_ADMIN_PASSWORD}")

if __name__ == "__main__":
    asyncio.run(bootstrap())
