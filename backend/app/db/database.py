from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

# SQLite needs connect_args for thread safety with FastAPI's thread pool
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency: yields a SQLAlchemy Session and guarantees it is
    closed after the request regardless of success or failure.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Creates all SQLAlchemy-mapped tables that do not already exist.
    Called once at application startup from main.py.
    """
    # Import all models so their metadata is registered before create_all
    import app.models.user  # noqa: F401
    import app.models.fraud  # noqa: F401
    Base.metadata.create_all(bind=engine)
