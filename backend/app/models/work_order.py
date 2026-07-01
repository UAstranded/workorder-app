import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base


class WorkOrderStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class ConfirmationStatus(str, enum.Enum):
    CONFIRMED = "Confirmed"
    UNCONFIRMED = "Unconfirmed"


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    account_number: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    po_number: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    dealer_id: Mapped[str] = mapped_column(String(100), nullable=True, default="")

    location_name: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    site_contact: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    address_line1: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    address_line2: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    city: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    state: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    zip: Mapped[str] = mapped_column(String(20), nullable=True, default="")
    primary_phone: Mapped[str] = mapped_column(String(50), nullable=True, default="")

    earliest_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    planned_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    calendar_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    calendar_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str] = mapped_column(Text, nullable=True, default="")

    site_timezone: Mapped[str] = mapped_column(String(100), nullable=True, default="America/New_York")

    status: Mapped[WorkOrderStatus] = mapped_column(SAEnum(WorkOrderStatus), default=WorkOrderStatus.OPEN, nullable=False)
    confirmation_status: Mapped[ConfirmationStatus] = mapped_column(SAEnum(ConfirmationStatus), default=ConfirmationStatus.UNCONFIRMED, nullable=False)
    google_event_id: Mapped[str] = mapped_column(String(255), nullable=True, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    modified_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    creator = relationship("User", back_populates="work_orders_created", foreign_keys=[created_by_id])
    modifier = relationship("User", back_populates="work_orders_modified", foreign_keys=[modified_by_id])
    tasks = relationship("Task", back_populates="work_order", cascade="all, delete-orphan", order_by="Task.sort_order")
    techs = relationship("WorkOrderTech", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkOrderTech.sort_order")
    images = relationship("ImageAttachment", back_populates="work_order", cascade="all, delete-orphan")
    expenses = relationship("WorkOrderExpense", back_populates="work_order", cascade="all, delete-orphan", order_by="WorkOrderExpense.sort_order")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    qty_required: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    work_order = relationship("WorkOrder", back_populates="tasks")
