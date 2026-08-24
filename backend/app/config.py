from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    database_path: Path = Path(
        os.getenv("VIRALY_DATABASE_PATH", ROOT_DIR / "data" / "viraly.db")
    )
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "").strip()
    cors_origins: tuple[str, ...] = tuple(
        item.strip()
        for item in os.getenv(
            "VIRALY_CORS_ORIGINS",
            "http://localhost:8086,http://127.0.0.1:8086",
        ).split(",")
        if item.strip()
    )
    dev_token: str = os.getenv("VIRALY_DEV_TOKEN", "").strip()
    preview_access_enabled: bool = os.getenv(
        "VIRALY_PREVIEW_ACCESS_ENABLED", "false"
    ).lower() in {"1", "true", "yes"}
    preview_secret: str = os.getenv("VIRALY_PREVIEW_SECRET", "").strip()
    preview_ai_daily_limit: int = int(
        os.getenv("VIRALY_PREVIEW_AI_DAILY_LIMIT", "30")
    )
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    google_state_secret: str = os.getenv("VIRALY_GOOGLE_STATE_SECRET", "").strip()
    google_callback_url: str = os.getenv(
        "VIRALY_GOOGLE_CALLBACK_URL",
        "https://viraly-ai.onrender.com/api/v1/auth/google/callback",
    ).strip()
    google_return_prefixes: tuple[str, ...] = tuple(
        item.strip().rstrip("/")
        for item in os.getenv(
            "VIRALY_GOOGLE_RETURN_PREFIXES",
            "viralyai://auth/google,exp://u.expo.dev/944108e1-dc57-48e7-bd7b-11a7e1ebc705",
        ).split(",")
        if item.strip()
    )
    visual_model: str = os.getenv("VIRALY_VISUAL_MODEL", "gpt-5.6-sol")
    strategy_model: str = os.getenv("VIRALY_STRATEGY_MODEL", "gpt-5.6-terra")
    fast_model: str = os.getenv("VIRALY_FAST_MODEL", "gpt-5.6-luna")
    anthropic_model: str = os.getenv(
        "VIRALY_ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929"
    )
    transcribe_model: str = os.getenv(
        "VIRALY_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe"
    )
    max_upload_bytes: int = (
        int(os.getenv("VIRALY_MAX_UPLOAD_MB", "100")) * 1024 * 1024
    )
    ai_daily_limit: int = int(os.getenv("VIRALY_AI_DAILY_LIMIT", "30"))


settings = Settings()
