from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import create_access_token
from app.schemas.auth import Token
from app.core.logging import log_activity
from app.services import auth_service
from app.core.rate_limit import limiter

router = APIRouter()

@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
@log_activity
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await auth_service.authenticate_user(db, form_data.username, form_data.password)
    token = create_access_token(str(user.id))
    return Token(access_token=token)
