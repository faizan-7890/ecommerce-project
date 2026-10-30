"""
Runtime environment helpers shared across the backend.
"""
import os


def is_production() -> bool:
    """APP_ENV wins over NODE_ENV; docker-compose.prod.yml sets NODE_ENV=production."""
    environment = os.getenv("APP_ENV") or os.getenv("NODE_ENV") or "development"
    return environment.lower() == "production"
