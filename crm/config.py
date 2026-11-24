import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"


def load_env(env_file: Path = ENV_PATH):
    """Tashqi kutubxonasiz .env faylini xavfsiz yuklash"""
    if not env_file.exists():
        return

    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception as e:
        print(f"Warning: .env yuklashda xatolik: {e}")


load_env()

SECRET_KEY = os.getenv("SECRET_KEY", "crm-secret-key-super-secure-change-in-production-2026")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DATABASE_URL = f"sqlite:///{BASE_DIR / 'crm.db'}"
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", f"http://localhost:{PORT}").rstrip("/")
