import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Integer, ForeignKey, Numeric, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class ExpenseType(str, enum.Enum):
    MATERIAL = "material"
    LABOR = "labor"
    MILEAGE = "mileage"
    PER_DIEM = "per_diem"


class WorkOrderExpense(Base):
    __tablename__ = "work_order_expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    expense_type: Mapped[ExpenseType] = mapped_column(SAEnum(ExpenseType), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    tech_name: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    work_order = relationship("WorkOrder", back_populates="expenses")
