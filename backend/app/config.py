"""Environment-backed application configuration."""

import os


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./event.db")
