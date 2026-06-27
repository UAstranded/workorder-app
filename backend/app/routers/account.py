from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["account"])


class AccountUpdate(BaseModel):
    display_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.put("/account")
async def update_account(
    body: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.display_name is not None:
        user.display_name = body.display_name

    if body.current_password and body.new_password:
        if not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(body.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        user.hashed_password = hash_password(body.new_password)

    await db.commit()
    return {"message": "Account updated successfully"}
