from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "IT Asset Manager"
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: str  # async: postgresql+asyncpg://...

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    AI_PROVIDER: Optional[str] = None   # "openai", "gemini", etc.
    AI_API_KEY: Optional[str] = None

    @property
    def SYNC_DATABASE_URL(self) -> str:
        # For Alembic, strip async driver
        url = str(self.DATABASE_URL)
        return url.replace("+asyncpg", "")

    class Config:
        env_file = ".env"

settings = Settings()
