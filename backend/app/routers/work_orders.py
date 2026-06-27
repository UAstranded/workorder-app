import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.work_order import WorkOrder, WorkOrderStatus, ConfirmationStatus, Task
from app.models.image import ImageAttachment
from app.schemas.work_order import WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse, WorkOrderListResponse, TaskSchema, ExpenseSchema
from app.models.expense import WorkOrderExpense
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/work-orders", tags=["work-orders"])


def generate_reference() -> str:
    import random
    import string
    ts = datetime.now().strftime("%y%m%d")
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"WO-{ts}-{rand}"


@router.get("", response_model=List[WorkOrderListResponse])
async def list_work_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    confirmation_status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_dir: Optional[str] = Query("desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(WorkOrder).options(selectinload(WorkOrder.tasks))

    if search:
        search_filter = or_(
            WorkOrder.reference.ilike(f"%{search}%"),
            WorkOrder.account_number.ilike(f"%{search}%"),
            WorkOrder.invoice_number.ilike(f"%{search}%"),
            WorkOrder.location_name.ilike(f"%{search}%"),
            WorkOrder.city.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if status:
        query = query.where(WorkOrder.status == status)
    if confirmation_status:
        query = query.where(WorkOrder.confirmation_status == confirmation_status)
    if city:
        query = query.where(WorkOrder.city.ilike(f"%{city}%"))
    if state:
        query = query.where(WorkOrder.state.ilike(f"%{state}%"))
    if date_from:
        query = query.where(WorkOrder.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.where(WorkOrder.created_at <= datetime.fromisoformat(date_to))

    sort_col = getattr(WorkOrder, sort_by, WorkOrder.created_at)
    order = sort_col.desc() if sort_dir == "desc" else sort_col.asc()
    query = query.order_by(order).offset(skip).limit(limit)

    result = await db.execute(query)
    orders = result.scalars().all()

    items = []
    for wo in orders:
        img_count = len(wo.images) if wo.images else 0
        items.append(WorkOrderListResponse(
            id=wo.id,
            reference=wo.reference,
            account_number=wo.account_number,
            invoice_number=wo.invoice_number,
            location_name=wo.location_name,
            city=wo.city,
            state=wo.state,
            status=wo.status.value if hasattr(wo.status, 'value') else wo.status,
            confirmation_status=wo.confirmation_status.value if hasattr(wo.confirmation_status, 'value') else wo.confirmation_status,
            earliest_start=wo.earliest_start,
            planned_start=wo.planned_start,
            due_date=wo.due_date,
            site_timezone=wo.site_timezone,
            created_at=wo.created_at,
            updated_at=wo.updated_at,
            image_count=img_count,
        ))
    return items


@router.get("/{reference}", response_model=WorkOrderResponse)
async def get_work_order(
    reference: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.tasks), selectinload(WorkOrder.images), selectinload(WorkOrder.expenses))
        .where(WorkOrder.reference == reference)
    )
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    img_count = len(wo.images) if wo.images else 0
    tasks = [
        TaskSchema(id=t.id, task_name=t.task_name, qty_required=t.qty_required, sort_order=t.sort_order)
        for t in (wo.tasks or [])
    ]
    expenses = [
        ExpenseSchema(
            id=e.id,
            work_order_id=e.work_order_id,
            expense_type=e.expense_type.value if hasattr(e.expense_type, 'value') else e.expense_type,
            amount=e.amount,
            description=e.description,
            tech_name=e.tech_name,
            sort_order=e.sort_order,
            created_at=e.created_at,
        )
        for e in (wo.expenses or [])
    ]
    return WorkOrderResponse(
        id=wo.id,
        reference=wo.reference,
        account_number=wo.account_number,
        invoice_number=wo.invoice_number,
        po_number=wo.po_number,
        dealer_id=wo.dealer_id,
        location_name=wo.location_name,
        site_contact=wo.site_contact,
        address_line1=wo.address_line1,
        address_line2=wo.address_line2,
        city=wo.city,
        state=wo.state,
        zip=wo.zip,
        primary_phone=wo.primary_phone,
        earliest_start=wo.earliest_start,
        planned_start=wo.planned_start,
        due_date=wo.due_date,
        site_timezone=wo.site_timezone,
        status=wo.status.value if hasattr(wo.status, 'value') else wo.status,
        confirmation_status=wo.confirmation_status.value if hasattr(wo.confirmation_status, 'value') else wo.confirmation_status,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
        created_by_id=wo.created_by_id,
        modified_by_id=wo.modified_by_id,
        tasks=tasks,
        expenses=expenses,
        image_count=img_count,
    )


@router.post("", response_model=WorkOrderResponse, status_code=201)
async def create_work_order(
    body: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ref = body.reference or generate_reference()

    wo = WorkOrder(
        reference=ref,
        account_number=body.account_number or "",
        invoice_number=body.invoice_number or "",
        po_number=body.po_number or "",
        dealer_id=body.dealer_id or "",
        location_name=body.location_name or "",
        site_contact=body.site_contact or "",
        address_line1=body.address_line1 or "",
        address_line2=body.address_line2 or "",
        city=body.city or "",
        state=body.state or "",
        zip=body.zip or "",
        primary_phone=body.primary_phone or "",
        earliest_start=body.earliest_start,
        planned_start=body.planned_start,
        due_date=body.due_date,
        site_timezone=body.site_timezone or "America/New_York",
        status=WorkOrderStatus(body.status) if body.status else WorkOrderStatus.OPEN_UNCONFIRMED,
        confirmation_status=ConfirmationStatus(body.confirmation_status) if body.confirmation_status else ConfirmationStatus.UNCONFIRMED,
        created_by_id=user.id,
        modified_by_id=user.id,
    )
    db.add(wo)
    await db.flush()

    for i, t in enumerate(body.tasks or []):
        task = Task(
            work_order_id=wo.id,
            task_name=t.task_name,
            qty_required=t.qty_required,
            sort_order=t.sort_order or i,
        )
        db.add(task)

    await db.commit()
    await db.refresh(wo)
    return await get_work_order(wo.reference, db, user)


@router.put("/{reference}", response_model=WorkOrderResponse)
async def update_work_order(
    reference: str,
    body: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkOrder).options(selectinload(WorkOrder.tasks)).where(WorkOrder.reference == reference)
    )
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    update_data = body.model_dump(exclude_unset=True, exclude={"tasks"})
    for field, value in update_data.items():
        if field == "status" and value is not None:
            setattr(wo, field, WorkOrderStatus(value))
        elif field == "confirmation_status" and value is not None:
            setattr(wo, field, ConfirmationStatus(value))
        elif value is not None:
            setattr(wo, field, value)
    wo.modified_by_id = user.id

    if body.tasks is not None:
        await db.execute(delete(Task).where(Task.work_order_id == wo.id))
        for i, t in enumerate(body.tasks):
            task = Task(
                work_order_id=wo.id,
                task_name=t.task_name,
                qty_required=t.qty_required,
                sort_order=t.sort_order or i,
            )
            db.add(task)

    await db.commit()
    await db.refresh(wo)
    return await get_work_order(wo.reference, db, user)


@router.delete("/{reference}", status_code=204)
async def delete_work_order(
    reference: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role.value not in ("admin", "dispatcher"):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    result = await db.execute(select(WorkOrder).where(WorkOrder.reference == reference))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    await db.delete(wo)
    await db.commit()
