from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class ExpenseCreate(BaseModel):
    expense_type: str
    amount: float
    description: Optional[str] = ""
    tech_name: Optional[str] = ""
    sort_order: int = 0


class ExpenseUpdate(BaseModel):
    expense_type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    tech_name: Optional[str] = None
    sort_order: Optional[int] = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    work_order_id: uuid.UUID
    expense_type: str
    amount: float
    description: Optional[str]
    tech_name: Optional[str]
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}
