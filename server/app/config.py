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

    # ── Chatbot / LLM ──────────────────────
    LLM_API_KEY: Optional[str] = ""
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    LLM_MODEL_ID: str = "nvidia/nemotron-3-super-120b-a12b:free"
    LLM_AUTH_HEADER: str = "Authorization"
    LLM_AUTH_SCHEME: str = "Bearer"

    # ── OpenRouter (legacy) ────────────────
    OPENROUTER_API_KEY: Optional[str] = ""
    OPENROUTER_MODEL: str = "google/gemma-4-31b-it:free"

    # ── Sarvam Speech-to-Text ──────────────
    SARVAM_API_KEY: Optional[str] = ""
    SARVAM_BASE_URL: str = "https://api.sarvam.ai"
    SARVAM_STT_MODEL: str = "saarika:v2.5"
    SARVAM_STT_MODE: Optional[str] = ""
    SARVAM_LANGUAGE_CODE: str = "unknown"

    # ── CORS ────────────────────────────────────
    ALLOWED_ORIGIN: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
