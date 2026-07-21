"""
Database configuration — SQLAlchemy engine and session factory for MySQL.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost:3306/ecommerce")

def _init_engine():
    if "sqlite" in DATABASE_URL:
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Try connecting to MySQL with 3-second timeout
    try:
        my_engine = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False,
            connect_args={"connect_timeout": 3},
        )
        with my_engine.connect() as conn:
            pass
        return my_engine
    except Exception as e:
        print(f"[WARN] MySQL connection failed ({e}). Falling back to SQLite for local development.")
        return create_engine("sqlite:///./ecommerce.db", connect_args={"check_same_thread": False})

engine = _init_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
