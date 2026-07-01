from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.expense import WorkOrderExpense, ExpenseType
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/work-orders", tags=["expenses"])


@router.get("/{reference}/expenses", response_model=List[ExpenseResponse])
async def list_expenses(
    reference: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(WorkOrder).where(WorkOrder.reference == reference))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    exp_result = await db.execute(
        select(WorkOrderExpense)
        .where(WorkOrderExpense.work_order_id == wo.id)
        .order_by(WorkOrderExpense.sort_order)
    )
    return exp_result.scalars().all()


@router.post("/{reference}/expenses", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    reference: str,
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(WorkOrder).where(WorkOrder.reference == reference))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    exp = WorkOrderExpense(
        work_order_id=wo.id,
        expense_type=ExpenseType(body.expense_type),
        qty=body.qty,
        unit_price=body.unit_price,
        amount=body.qty * body.unit_price,
        description=body.description or "",
        tech_name=body.tech_name or "",
        sort_order=body.sort_order,
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return ExpenseResponse.model_validate(exp)


@router.put("/{reference}/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    reference: str,
    expense_id: str,
    body: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkOrderExpense).where(WorkOrderExpense.id == expense_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "expense_type" and value is not None:
            setattr(exp, field, ExpenseType(value))
        elif value is not None:
            setattr(exp, field, value)

    exp.amount = exp.qty * exp.unit_price
    await db.commit()
    await db.refresh(exp)
    return ExpenseResponse.model_validate(exp)


@router.delete("/{reference}/expenses/{expense_id}", status_code=204)
async def delete_expense(
    reference: str,
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkOrderExpense).where(WorkOrderExpense.id == expense_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(exp)
    await db.commit()
