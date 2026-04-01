"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── App ─────────────────────────────────────
    APP_NAME: str = "CreditSaathi API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 5000

    # ── MongoDB ─────────────────────────────────
    MONGO_URI: str = "mongodb://localhost:27017/creditsaathi"

    # ── JWT ──────────────────────────────────────
    JWT_SECRET: str = "your-256-bit-jwt-secret-here"
    JWT_REFRESH_SECRET: str = "your-256-bit-refresh-secret-here"
    JWT_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # ── ML Service ──────────────────────────────
    ML_SERVICE_URL: str = "http://localhost:8000"

    # ── Chatbot / OpenRouter ────────────────
    OPENROUTER_API_KEY: Optional[str] = ""

    # ── CORS ────────────────────────────────────
    ALLOWED_ORIGIN: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
