from typing import Annotated
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.models.user import User
from app.schemas.role import RoleName

from app.core.exceptions import PermissionDenied

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Convert string to UUID with validation
    try:
        user_id = UUID(sub)
    except (ValueError, TypeError):
        raise credentials_exception

    user = await User.get_by_id(db, user_id)
    if not user:
        raise credentials_exception
    
    # Security: Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    return user

def require_permission(permission_slug: str):
    async def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if not user.has_permission(permission_slug):
             raise PermissionDenied(f"Missing permission: {permission_slug}")
        return user
    return _checker

def require_role(required: RoleName):
    """
    Deprecated: Use require_permission instead.
    Kept for backward compatibility during migration.
    """
    async def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.has_role(RoleName.admin):
            return user
        if not user.has_role(required):
            raise PermissionDenied("Insufficient permissions")
        return user
    return _checker
