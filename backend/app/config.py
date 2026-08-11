"""
Application configuration — reads from environment variables with sane defaults.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ───────────────────────────────────────────────────────────────
    # asyncpg-based URL for SQLAlchemy async engine
    DATABASE_URL: str = (
        "postgresql+asyncpg://fleet_user:fleet_pass@localhost:5432/fleet_db"
    )

    # ── Server ─────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Add your frontend origin here
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
    ]

    # ── Tracking & OSRM ────────────────────────────────────────────────────────
    OSRM_BASE_URL: str = "http://router.project-osrm.org"
    MAP_MATCHING_ENABLED: bool = True
    GPS_OUTLIER_THRESHOLD_KMH: float = 200.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Single shared instance
settings = Settings()
