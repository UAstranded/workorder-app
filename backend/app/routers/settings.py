from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict

from app.database import get_db
from app.models.user import User, UserRole
from app.models.app_settings import AppSetting
from app.schemas.settings import AppSettingCreate, AppSettingResponse, LogoFaviconResponse
from app.routers.auth import get_current_user

DEFAULT_LOGO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
  <rect width="40" height="40" rx="8" fill="#0d9488"/>
  <path d="M12 28V12l8-4 8 4v16l-8 4-8-4z" fill="white" opacity="0.9"/>
  <path d="M20 8v24M12 16h16M12 24h16" stroke="#0d9488" stroke-width="1.5" opacity="0.3"/>
</svg>"""

DEFAULT_FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0d9488"/>
  <path d="M10 22V10l6-3 6 3v12l-6 3-6-3z" fill="white" opacity="0.9"/>
</svg>"""

router = APIRouter(prefix="/api/settings", tags=["settings"])


async def get_setting(db: AsyncSession, key: str) -> str:
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    s = result.scalar_one_or_none()
    return s.value if s else ""


@router.get("/logo-favicon", response_model=LogoFaviconResponse)
async def get_logo_favicon(db: AsyncSession = Depends(get_db)):
    logo = await get_setting(db, "logo_svg")
    favicon = await get_setting(db, "favicon_svg")
    return LogoFaviconResponse(
        logo_svg=logo or DEFAULT_LOGO_SVG,
        favicon_svg=favicon or DEFAULT_FAVICON_SVG,
    )


@router.put("/logo-favicon", response_model=LogoFaviconResponse)
async def update_logo_favicon(
    body: Dict[str, str],
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")

    for key in ("logo_svg", "favicon_svg"):
        if key in body:
            result = await db.execute(select(AppSetting).where(AppSetting.key == key))
            s = result.scalar_one_or_none()
            if s:
                s.value = body[key]
            else:
                db.add(AppSetting(key=key, value=body[key]))

    await db.commit()

    logo = await get_setting(db, "logo_svg")
    favicon = await get_setting(db, "favicon_svg")
    return LogoFaviconResponse(
        logo_svg=logo or DEFAULT_LOGO_SVG,
        favicon_svg=favicon or DEFAULT_FAVICON_SVG,
    )
