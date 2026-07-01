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
TEMPLATE_KEY = "calendar_event_template"

DEFAULT_SUMMARY_TEMPLATE = "[{reference}] {location}"
DEFAULT_DESCRIPTION_TEMPLATE = """Work Order: {reference}
Account: {account}
Location: {location}
Address: {address}
Earliest Start: {earliest_start}
Planned Start: {planned_start}
Due Date: {due_date}
Timezone: {site_timezone}
Status: {status}
Link: {link}
{tasks}
{techs}"""


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


TEMPLATE_PLACEHOLDERS = {
    "reference": "Work order reference number",
    "location": "Location name",
    "account": "Account number",
    "address": "Full address (line1, city, state)",
    "status": "Work order status",
    "earliest_start": "Earliest start date/time",
    "planned_start": "Planned start date/time",
    "due_date": "Due date",
    "calendar_start": "Calendar event start date/time",
    "calendar_end": "Calendar event end date/time",
    "site_timezone": "Site timezone",
    "tasks": "Task list (one per line)",
    "techs": "Tech names (comma-separated)",
    "link": "Public URL to the work order",
}


async def _get_template(db: AsyncSession) -> dict:
    from app.models.app_settings import AppSetting

    result = await db.execute(select(AppSetting).where(AppSetting.key == TEMPLATE_KEY))
    row = result.scalar_one_or_none()
    if row and row.value:
        try:
            return json.loads(row.value)
        except Exception:
            pass
    return {"summary": DEFAULT_SUMMARY_TEMPLATE, "description": DEFAULT_DESCRIPTION_TEMPLATE}


async def _save_template(template: dict, db: AsyncSession) -> None:
    from app.models.app_settings import AppSetting

    result = await db.execute(select(AppSetting).where(AppSetting.key == TEMPLATE_KEY))
    row = result.scalar_one_or_none()
    value = json.dumps(template)
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=TEMPLATE_KEY, value=value))
    await db.commit()


def _fmt_dt(dt) -> str:
    if dt is None:
        return "-"
    if hasattr(dt, "strftime"):
        return dt.strftime("%Y-%m-%d %H:%M")
    return str(dt)


def _render_template(template_str: str, work_order, tasks_text: str, techs_text: str) -> str:
    address = f"{work_order.address_line1 or ''}, {work_order.city or ''}, {work_order.state or ''}".strip(", ")
    return template_str.replace("{reference}", work_order.reference or "") \
        .replace("{location}", work_order.location_name or "No Location") \
        .replace("{account}", work_order.account_number or "-") \
        .replace("{address}", address) \
        .replace("{status}", work_order.status or "-") \
        .replace("{earliest_start}", _fmt_dt(work_order.earliest_start)) \
        .replace("{planned_start}", _fmt_dt(work_order.planned_start)) \
        .replace("{due_date}", _fmt_dt(work_order.due_date)) \
        .replace("{calendar_start}", _fmt_dt(work_order.calendar_start)) \
        .replace("{calendar_end}", _fmt_dt(work_order.calendar_end)) \
        .replace("{site_timezone}", work_order.site_timezone or "-") \
        .replace("{tasks}", tasks_text) \
        .replace("{techs}", techs_text) \
        .replace("{link}", f"{PUBLIC_URL}/orders/{work_order.reference}")


async def list_calendars(db: AsyncSession) -> list:
    service = await _get_service(db)
    if not service:
        return []

    selected_id = await _get_calendar_id(db)
    try:
        cal_list = service.calendarList().list().execute()
        items = []
        for cal in cal_list.get("items", []):
            items.append({
                "id": cal["id"],
                "summary": cal.get("summary", cal["id"]),
                "selected": cal["id"] == selected_id or (
                    selected_id == "primary" and cal.get("primary")
                ),
            })
        items.sort(key=lambda c: (not c["selected"], c["summary"].lower()))
        return items
    except HttpError:
        return []


async def ensure_calendar_exists(db: AsyncSession) -> str:
    service = await _get_service(db)
    if not service:
        return GOOGLE_CALENDAR_ID

    calendar_id = await _get_calendar_id(db)

    try:
        cal = service.calendars().get(calendarId=calendar_id).execute()
        return cal["id"]
    except HttpError:
        return GOOGLE_CALENDAR_ID


def _build_event_body(work_order, start_dt, end_dt, template: Optional[dict] = None):
    tasks_text = ""
    if hasattr(work_order, "tasks") and work_order.tasks:
        tasks_text = "\n".join(
            f"- {t.task_name} (x{t.qty_required})" for t in work_order.tasks
        )

    techs_text = ""
    if hasattr(work_order, "techs") and work_order.techs:
        techs_text = "Techs: " + ", ".join(t.tech_name for t in work_order.techs)

    summary_tpl = (template or {}).get("summary", DEFAULT_SUMMARY_TEMPLATE)
    desc_tpl = (template or {}).get("description", DEFAULT_DESCRIPTION_TEMPLATE)

    summary = _render_template(summary_tpl, work_order, tasks_text, techs_text)
    description = _render_template(desc_tpl, work_order, tasks_text, techs_text)

    return {
        "summary": summary,
        "description": description,
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
    template = await _get_template(db)

    start_dt = work_order.calendar_start or work_order.earliest_start or work_order.planned_start or work_order.due_date
    end_dt = work_order.calendar_end or work_order.due_date or work_order.planned_start or work_order.earliest_start

    if not start_dt:
        return None

    if not end_dt or end_dt <= start_dt:
        end_dt = start_dt + timedelta(hours=2)

    event = _build_event_body(work_order, start_dt, end_dt, template)

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
    template = await _get_template(db)

    start_dt = work_order.calendar_start or work_order.earliest_start or work_order.planned_start or work_order.due_date
    end_dt = work_order.calendar_end or work_order.due_date or work_order.planned_start or work_order.earliest_start

    if not start_dt:
        await delete_event(work_order.google_event_id, db)
        return None

    if not end_dt or end_dt <= start_dt:
        end_dt = start_dt + timedelta(hours=2)

    event = _build_event_body(work_order, start_dt, end_dt, template)

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
