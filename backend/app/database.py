"""SQLAlchemy engine, declarative base, and session factory."""

from collections.abc import Generator

from sqlalchemy import create_engine, event as sqlalchemy_event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL


class Base(DeclarativeBase):
    """Base class for database models."""


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

if DATABASE_URL.startswith("sqlite"):

    @sqlalchemy_event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def initialize_database() -> None:
    """Import model metadata and create any missing tables."""
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for a request and always close it."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
