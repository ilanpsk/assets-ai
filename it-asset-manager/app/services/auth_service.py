from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import verify_password
from app.core.exceptions import AuthenticationError

async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    res = await db.execute(select(User).where(User.email == username))
    user = res.unique().scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise AuthenticationError("Incorrect username or password")
    return user







