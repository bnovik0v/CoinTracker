"""Database module"""

from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.settings import get_settings

settings = get_settings()

DATABASE_URL = settings.database_url

engine = create_engine(DATABASE_URL, future=True, echo=settings.sql_echo)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


def get_session():
    """Get database session with contextmanager."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@contextmanager
def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
