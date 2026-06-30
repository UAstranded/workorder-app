import json
from datetime import timedelta
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_CALENDAR_ID, PUBLIC_URL

SCOPES = ["https://www.googleapis.com/auth/calendar"]

TOKEN_KEY = "google_calendar_tokens"
CALENDAR_ID_KEY = "google_calendar_id"


def get_flow(state: Optional[str] = None) -> Flow:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_REDIRECT_URI],
            }
        },
        scopes=SCOPES,
        state=state,
    )
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    return flow


def get_auth_url() -> str:
    flow = get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def exchange_code(code: str) -> dict:
    flow = get_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
    }


async def _load_credentials(db: AsyncSession) -> Optional[Credentials]:
    from app.models.app_settings import AppSetting

    result = await db.execute(select(AppSetting).where(AppSetting.key == TOKEN_KEY))
    row = result.scalar_one_or_none()
    if not row or not row.value:
        return None
    try:
        token_data = json.loads(row.value)
        creds = Credentials.from_authorized_user_info(token_data, SCOPES)
        return creds
    except Exception:
        return None


async def _save_credentials(creds: Credentials, db: AsyncSession) -> None:
    from app.models.app_settings import AppSetting

    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes),
    }
    result = await db.execute(select(AppSetting).where(AppSetting.key == TOKEN_KEY))
    row = result.scalar_one_or_none()
    if row:
        row.value = json.dumps(token_data)
    else:
        db.add(AppSetting(key=TOKEN_KEY, value=json.dumps(token_data)))
    await db.commit()


async def _get_calendar_id(db: AsyncSession) -> str:
    from app.models.app_settings import AppSetting

    result = await db.execute(select(AppSetting).where(AppSetting.key == CALENDAR_ID_KEY))
    row = result.scalar_one_or_none()
    if row and row.value:
        return row.value
    return GOOGLE_CALENDAR_ID


async def _save_calendar_id(calendar_id: str, db: AsyncSession) -> None:
    from app.models.app_settings import AppSetting

    result = await db.execute(select(AppSetting).where(AppSetting.key == CALENDAR_ID_KEY))
    row = result.scalar_one_or_none()
    if row:
        row.value = calendar_id
    else:
        db.add(AppSetting(key=CALENDAR_ID_KEY, value=calendar_id))
    await db.commit()


async def _get_service(db: AsyncSession):
    creds = await _load_credentials(db)
    if not creds:
        return None
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        await _save_credentials(creds, db)
    if not creds or not creds.valid:
        return None
    return build("calendar", "v3", credentials=creds)


async def is_connected(db: AsyncSession) -> bool:
    return await _load_credentials(db) is not None


async def ensure_calendar_exists(db: AsyncSession) -> str:
    service = await _get_service(db)
    if not service:
        return GOOGLE_CALENDAR_ID

    calendar_id = await _get_calendar_id(db)

    try:
        cal = service.calendars().get(calendarId=calendar_id).execute()
        return cal["id"]
    except HttpError:
        pass

    try:
        cal = {
            "summary": "Work Orders",
            "description": "Calendar synced from Work Order Manager",
            "timeZone": "America/New_York",
        }
        created = service.calendars().insert(body=cal).execute()
        await _save_calendar_id(created["id"], db)
        return created["id"]
    except HttpError:
        return GOOGLE_CALENDAR_ID


def _build_event_body(work_order, start_dt, end_dt):
    tasks_text = ""
    if hasattr(work_order, "tasks") and work_order.tasks:
        tasks_text = "\n\nTasks:\n" + "\n".join(
            f"- {t.task_name} (x{t.qty_required})" for t in work_order.tasks
        )

    techs_text = ""
    if hasattr(work_order, "techs") and work_order.techs:
        techs_text = "\n\nTechs: " + ", ".join(t.tech_name for t in work_order.techs)

    return {
        "summary": f"[{work_order.reference}] {work_order.location_name or 'No Location'}",
        "description": (
            f"Work Order: {work_order.reference}\n"
            f"Account: {work_order.account_number or '-'}\n"
            f"Location: {work_order.location_name or '-'}\n"
            f"Address: {work_order.address_line1 or ''} {work_order.city or ''} {work_order.state or ''}\n"
            f"Status: {work_order.status or '-'}\n"
            f"Link: {PUBLIC_URL}/orders/{work_order.reference}"
            f"{tasks_text}"
            f"{techs_text}"
        ),
        "location": f"{work_order.address_line1 or ''}, {work_order.city or ''}, {work_order.state or ''}".strip(", "),
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": work_order.site_timezone or "America/New_York",
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": work_order.site_timezone or "America/New_York",
        },
        "reminders": {"useDefault": True},
    }


async def create_event(work_order, db: AsyncSession) -> Optional[str]:
    service = await _get_service(db)
    if not service:
        return None

    calendar_id = await ensure_calendar_exists(db)

    start_dt = work_order.earliest_start or work_order.planned_start or work_order.due_date
    end_dt = work_order.due_date or work_order.planned_start or work_order.earliest_start

    if not start_dt:
        return None

    if not end_dt or end_dt <= start_dt:
        end_dt = start_dt + timedelta(hours=2)

    event = _build_event_body(work_order, start_dt, end_dt)

    try:
        created = service.events().insert(calendarId=calendar_id, body=event).execute()
        return created["id"]
    except HttpError:
        return None


async def update_event(work_order, db: AsyncSession) -> Optional[str]:
    if not work_order.google_event_id:
        return await create_event(work_order, db)

    service = await _get_service(db)
    if not service:
        return None

    calendar_id = await _get_calendar_id(db)

    start_dt = work_order.earliest_start or work_order.planned_start or work_order.due_date
    end_dt = work_order.due_date or work_order.planned_start or work_order.earliest_start

    if not start_dt:
        await delete_event(work_order.google_event_id, db)
        return None

    if not end_dt or end_dt <= start_dt:
        end_dt = start_dt + timedelta(hours=2)

    event = _build_event_body(work_order, start_dt, end_dt)

    try:
        updated = service.events().update(
            calendarId=calendar_id, eventId=work_order.google_event_id, body=event
        ).execute()
        return updated["id"]
    except HttpError as e:
        if e.resp and e.resp.status in (404, 410):
            return await create_event(work_order, db)
        return None


async def delete_event(event_id: str, db: AsyncSession) -> bool:
    service = await _get_service(db)
    if not service:
        return False

    calendar_id = await _get_calendar_id(db)

    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return True
    except HttpError:
        return False
