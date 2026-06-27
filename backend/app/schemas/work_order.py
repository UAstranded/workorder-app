from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
import uuid
import re


class TaskSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    task_name: str
    qty_required: int = 1
    sort_order: int = 0


class TaskCreate(BaseModel):
    task_name: str
    qty_required: int = 1
    sort_order: int = 0


class WorkOrderBase(BaseModel):
    reference: Optional[str] = None
    account_number: Optional[str] = ""
    invoice_number: Optional[str] = ""
    po_number: Optional[str] = ""
    dealer_id: Optional[str] = ""

    location_name: Optional[str] = ""
    site_contact: Optional[str] = ""
    address_line1: Optional[str] = ""
    address_line2: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    zip: Optional[str] = ""
    primary_phone: Optional[str] = ""

    earliest_start: Optional[datetime] = None
    planned_start: Optional[datetime] = None
    due_date: Optional[datetime] = None

    site_timezone: Optional[str] = "America/New_York"

    notes: Optional[str] = ""

    status: Optional[str] = "Open - Unconfirmed"
    confirmation_status: Optional[str] = "Unconfirmed"

    tasks: Optional[List[TaskCreate]] = []


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(WorkOrderBase):
    pass


class ExpenseSchema(BaseModel):
    id: uuid.UUID
    work_order_id: uuid.UUID
    expense_type: str
    amount: float
    description: Optional[str] = ""
    tech_name: Optional[str] = ""
    sort_order: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkOrderResponse(WorkOrderBase):
    id: uuid.UUID
    reference: str
    status: str
    confirmation_status: str
    site_timezone: str
    created_at: datetime
    updated_at: datetime
    created_by_id: Optional[uuid.UUID] = None
    modified_by_id: Optional[uuid.UUID] = None
    tasks: List[TaskSchema] = []
    expenses: List[ExpenseSchema] = []
    image_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class WorkOrderListResponse(BaseModel):
    id: uuid.UUID
    reference: str
    account_number: Optional[str]
    invoice_number: Optional[str]
    location_name: Optional[str]
    city: Optional[str]
    state: Optional[str]
    status: str
    confirmation_status: str
    earliest_start: Optional[datetime]
    planned_start: Optional[datetime]
    due_date: Optional[datetime]
    site_timezone: str
    created_at: datetime
    updated_at: datetime
    image_count: Optional[int] = 0

    model_config = {"from_attributes": True}
