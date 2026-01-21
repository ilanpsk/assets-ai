from typing import List, Callable
import logging

from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services import role_service
from app.core.exceptions import ResourceNotFound, PermissionDenied


class ListRolesInput(BaseModel):
    pass


class GetRoleInput(BaseModel):
    name: str = Field(description="Name of the role (e.g. 'admin')")


def get_role_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    """
    Tools for managing roles and permissions. Restricted to role managers/admin.
    """
    logger = logging.getLogger("app.ai.tools.role")

    def _ensure_manage_access():
        if not (user.has_permission("role:manage") or user.has_role("admin")):
            raise PermissionDenied("Not authorized to manage roles.")

    async def _list_permissions() -> str:
        async with session_factory() as db:
            try:
                _ensure_manage_access()
                perms = await role_service.list_permissions(db)
                return str([{"slug": p.slug, "description": p.description} for p in perms])
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"List permissions failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _list_roles() -> str:
        async with session_factory() as db:
            try:
                _ensure_manage_access()
                roles = await role_service.list_roles(db)
                return str(
                    [
                        {
                            "name": r.name,
                            "description": r.description,
                            "permissions": [p.slug for p in r.permissions],
                        }
                        for r in roles
                    ]
                )
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except Exception as e:
                logger.error(f"List roles failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    async def _get_role(name: str) -> str:
        async with session_factory() as db:
            try:
                _ensure_manage_access()
                r = await role_service.get_role(db, name)
                return str(
                    {
                        "name": r.name,
                        "description": r.description,
                        "permissions": [p.slug for p in r.permissions],
                    }
                )
            except PermissionDenied as e:
                return f"Permission Denied: {str(e)}"
            except ResourceNotFound:
                return "Role not found."
            except Exception as e:
                logger.error(f"Get role failed: {str(e)}", exc_info=True)
                return f"System Error: {str(e)}"

    tools: List[StructuredTool] = []

    if user.has_permission("role:manage") or user.has_role("admin"):
        tools.extend(
            [
                StructuredTool.from_function(
                    coroutine=_list_permissions,
                    name="list_permissions",
                    description="List all available permission slugs and descriptions.",
                    args_schema=ListRolesInput,
                ),
                StructuredTool.from_function(
                    coroutine=_list_roles,
                    name="list_roles",
                    description="List all roles with their permissions.",
                    args_schema=ListRolesInput,
                ),
                StructuredTool.from_function(
                    coroutine=_get_role,
                    name="get_role_details",
                    description="Get details for a specific role.",
                    args_schema=GetRoleInput,
                ),
            ]
        )

    return tools




