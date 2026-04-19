from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config.settings import settings

if not settings.POSTGRES_URI:
    raise ValueError("POSTGRES_URI is not set in environment variables")

engine = create_async_engine(
    settings.POSTGRES_URI, 
    echo=True, 
    future=True,
    pool_size=20, 
    max_overflow=10 
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_sql_db():
    if AsyncSessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail="SQL database session factory is not initialized",
        )

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()