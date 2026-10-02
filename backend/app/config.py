"""Environment-backed application configuration."""

import os


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./event.db")
AI_PROVIDER = os.getenv("AI_PROVIDER", "fallback").strip().lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
try:
    GEMINI_TIMEOUT_SECONDS = max(0.1, float(os.getenv("GEMINI_TIMEOUT_SECONDS", "8")))
except ValueError:
    GEMINI_TIMEOUT_SECONDS = 8.0
