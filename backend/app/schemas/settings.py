from pydantic import BaseModel
from typing import Optional


class AppSettingCreate(BaseModel):
    key: str
    value: str


class AppSettingResponse(BaseModel):
    key: str
    value: str

    model_config = {"from_attributes": True}


class LogoFaviconResponse(BaseModel):
    logo_svg: Optional[str] = None
    favicon_svg: Optional[str] = None
