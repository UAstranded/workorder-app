import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.app_settings import AppSetting
from app.models.user import User, UserRole
from app.models.work_order import WorkOrder
from app.routers.auth import get_current_user
from app.services import calendar_service

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/auth")
async def calendar_auth():
    auth_url = calendar_service.get_auth_url()
    return {"auth_url": auth_url}


@router.get("/auth/callback")
async def calendar_auth_callback(code: str, db: AsyncSession = Depends(get_db)):
    token_data = calendar_service.exchange_code(code)
    result = await db.execute(select(AppSetting).where(AppSetting.key == "google_calendar_tokens"))
    row = result.scalar_one_or_none()
    if row:
        row.value = json.dumps(token_data)
    else:
        db.add(AppSetting(key="google_calendar_tokens", value=json.dumps(token_data)))
    await db.commit()
    return {"status": "connected"}


@router.get("/status")
async def calendar_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    connected = await calendar_service.is_connected(db)
    return {"connected": connected}


@router.post("/sync/{reference}")
async def sync_work_order_to_calendar(
    reference: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WorkOrder)
        .options(selectinload(WorkOrder.tasks), selectinload(WorkOrder.techs))
        .where(WorkOrder.reference == reference)
    )
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    if wo.google_event_id:
        new_id = await calendar_service.update_event(wo, db)
    else:
        new_id = await calendar_service.create_event(wo, db)

    if new_id:
        wo.google_event_id = new_id
        await db.commit()
        return {"synced": True, "event_id": new_id}
    else:
        raise HTTPException(status_code=400, detail="Calendar not connected. Connect in Settings first.")


@router.get("/template")
async def get_calendar_template(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = await calendar_service._get_template(db)
    return {
        "template": template,
        "placeholders": calendar_service.TEMPLATE_PLACEHOLDERS,
    }


@router.put("/template")
async def update_calendar_template(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = body.get("template", {})
    await calendar_service._save_template(template, db)
    return {"status": "saved", "template": template}


@router.post("/disconnect")
async def disconnect_calendar(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AppSetting).where(AppSetting.key == "google_calendar_tokens"))
    row = result.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
    return {"status": "disconnected"}
