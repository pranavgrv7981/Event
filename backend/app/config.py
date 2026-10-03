"""Environment-backed application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./event.db")
AI_PROVIDER = os.getenv("AI_PROVIDER", "fallback").strip().lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
NOTION_API_KEY = os.getenv("NOTION_API_KEY", "").strip()
NOTION_PARENT_PAGE_ID = os.getenv("NOTION_PARENT_PAGE_ID", "").strip()
NOTION_SESSIONS_DATABASE_ID = os.getenv("NOTION_SESSIONS_DATABASE_ID", "").strip()
NOTION_TASKS_DATABASE_ID = os.getenv("NOTION_TASKS_DATABASE_ID", "").strip()
NOTION_RISKS_DATABASE_ID = os.getenv("NOTION_RISKS_DATABASE_ID", "").strip()
NOTION_CHANGES_DATABASE_ID = os.getenv("NOTION_CHANGES_DATABASE_ID", "").strip()
try:
    GEMINI_TIMEOUT_SECONDS = max(0.1, float(os.getenv("GEMINI_TIMEOUT_SECONDS", "8")))
except ValueError:
    GEMINI_TIMEOUT_SECONDS = 8.0
