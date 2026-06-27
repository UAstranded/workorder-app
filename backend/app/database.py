from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


MIGRATIONS = [
    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''",
]


async def init_db():
    from app.models.user import User
    from app.models.work_order import WorkOrder, Task
    from app.models.image import ImageAttachment, LabelSuggestion
    from app.models.expense import WorkOrderExpense
    from app.models.app_settings import AppSetting
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # column already exists or not applicable
