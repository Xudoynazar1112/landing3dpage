from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base
from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def init_models():
    """Barcha jadvallarni bazada yaratish"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
