from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.work_order import WorkOrder
from app.schemas.work_order import WorkOrderResponse, WorkOrderListResponse, TaskSchema
from app.routers.auth import get_current_user
from app.services.export_service import export_single_work_order, export_multiple_work_orders

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/work-order/{reference}")
async def export_work_order(
    reference: str,
    tz: str = Query("UTC"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.tasks))
        .where(WorkOrder.reference == reference)
    )
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    tasks = [
        TaskSchema(id=t.id, task_name=t.task_name, qty_required=t.qty_required, sort_order=t.sort_order)
        for t in (wo.tasks or [])
    ]
    wo_resp = WorkOrderResponse(
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
        image_count=0,
    )

    output = export_single_work_order(wo_resp, tz)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=work-order-{reference}.xlsx"},
    )


@router.get("/work-orders")
async def export_work_orders(
    ids: Optional[str] = Query(None, description="Comma-separated order IDs"),
    tz: str = Query("UTC"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(WorkOrder).order_by(WorkOrder.created_at.desc())
    if ids:
        refs = [r.strip() for r in ids.split(",")]
        query = query.where(WorkOrder.reference.in_(refs))

    result = await db.execute(query)
    orders = result.scalars().all()

    items = []
    for wo in orders:
        img_count = len(wo.images) if hasattr(wo, 'images') and wo.images else 0
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

    output = export_multiple_work_orders(items, tz)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=work-orders.xlsx"},
    )
