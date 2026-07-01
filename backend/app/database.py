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
    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS calendar_start TIMESTAMPTZ DEFAULT NULL",
    "ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS calendar_end TIMESTAMPTZ DEFAULT NULL",
    "ALTER TABLE work_order_expenses ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1",
    "ALTER TABLE work_order_expenses ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2) DEFAULT 0",
    "UPDATE work_order_expenses SET unit_price = amount WHERE unit_price = 0",
]


import asyncio


async def init_db():
    from app.models.user import User
    from app.models.work_order import WorkOrder, Task
    from app.models.image import ImageAttachment, LabelSuggestion
    from app.models.expense import WorkOrderExpense
    from app.models.app_settings import AppSetting
    from app.models.tech import WorkOrderTech

    for attempt in range(15):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                for stmt in MIGRATIONS:
                    try:
                        await conn.execute(text(stmt))
                    except Exception:
                        pass
                await conn.execute(
                    text("UPDATE work_orders SET status = 'OPEN' WHERE status IN ('OPEN_CONFIRMED', 'OPEN_UNCONFIRMED')")
                )
            return
        except Exception as e:
            if attempt < 14:
                print(f"DB connect attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(min(2 ** attempt, 30))
            else:
                raise
