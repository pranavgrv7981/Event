"""SQLAlchemy engine, declarative base, and session factory."""

from collections.abc import Generator

from sqlalchemy import create_engine, event as sqlalchemy_event, inspect
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
    """Create missing tables and add the nullable source-change links when upgrading."""
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    for table_name in ("tasks", "risks"):
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if "source_change_id" not in columns:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    f"ALTER TABLE {table_name} ADD COLUMN source_change_id "
                    "VARCHAR(64) REFERENCES changes(id) ON DELETE SET NULL"
                )
        index_name = f"ix_{table_name}_source_change_id"
        indexes = {index["name"] for index in inspector.get_indexes(table_name)}
        if index_name not in indexes:
            with engine.begin() as connection:
                connection.exec_driver_sql(
                    f"CREATE INDEX {index_name} ON {table_name}(source_change_id)"
                )


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for a request and always close it."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
