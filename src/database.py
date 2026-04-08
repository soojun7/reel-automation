import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Text, DateTime, Integer, JSON
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "")

# PostgreSQL URL 변환 (render.com은 postgres:// 형식을 사용하지만 asyncpg는 postgresql+asyncpg:// 필요)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = None
async_session = None

if DATABASE_URL:
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    print(f"[DB] Connected to database")
else:
    print("[DB] DATABASE_URL not set, running without database")

class Base(DeclarativeBase):
    pass

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True)  # run_id
    name = Column(String(200), nullable=True)
    style_id = Column(String(50), default="personification")
    global_emotion = Column(String(50), default="normal")
    script_text = Column(Text, default="")
    global_context = Column(Text, default="")
    segments = Column(JSON, default=list)  # List of segment objects
    combined_video_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

async def init_db():
    """데이터베이스 테이블 생성"""
    if engine:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[DB] Tables created")

async def get_session() -> AsyncSession:
    """세션 생성"""
    if not async_session:
        raise Exception("Database not configured")
    async with async_session() as session:
        yield session
