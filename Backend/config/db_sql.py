from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config.settings import settings

# 1. Initialize immediately to prevent 'NoneType' errors in lifespan
if not settings.POSTGRES_URI:
    raise ValueError("POSTGRES_URI is not set in environment variables")

# Create the async engine at the module level
engine = create_async_engine(
    settings.POSTGRES_URI, 
    echo=True, 
    future=True,
    # Recommended for high concurrency:
    pool_size=20, 
    max_overflow=10 
)

# Create the session factory immediately
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

# Helper to get a database session for FastAPI routes
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