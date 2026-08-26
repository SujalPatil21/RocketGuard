import os
from pydantic_settings import BaseSettings


def _find_root_env() -> str:
    """
    Resolves the root .env regardless of the CWD uvicorn is launched from.
    backend/app/core/config.py → 3 levels up = Rocket root.
    """
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "..", ".env"
    )


class Settings(BaseSettings):
    # ── Project ────────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "AP Sentinel"

    # ── Database ───────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./auth.db"

    # ── JWT ────────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── SMTP ───────────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""

    # ── OTP ────────────────────────────────────────────────────────────────────
    OTP_EXPIRY: int = 300          # seconds
    RESEND_DELAY: int = 45         # seconds
    ENABLE_LOGIN_OTP: bool = True

    # ── Demo mode ──────────────────────────────────────────────────────────────
    DEMO_MODE: bool = True

    # ── RocketRide (existing) ──────────────────────────────────────────────────
    ROCKETRIDE_URI: str = ""
    ROCKETRIDE_APIKEY: str = ""

    class Config:
        env_file = _find_root_env()
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
