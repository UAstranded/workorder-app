import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.config import UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_MB
from app.models.user import User
from app.models.work_order import WorkOrder
from app.models.image import ImageAttachment, LabelSuggestion
from app.schemas.image import ImageAttachmentResponse, LabelSuggestionResponse, ImageUpdateLabel
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/images", tags=["images"])


def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "thumbnails"), exist_ok=True)


@router.post("/upload/{work_order_id}", response_model=ImageAttachmentResponse)
async def upload_image(
    work_order_id: uuid.UUID,
    file: UploadFile = File(...),
    label: str = Form(""),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    wo_result = await db.execute(select(WorkOrder).where(WorkOrder.id == work_order_id))
    if not wo_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Work order not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    ensure_upload_dir()
    stored_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_UPLOAD_SIZE_MB}MB limit")

    with open(file_path, "wb") as f:
        f.write(contents)

    img = ImageAttachment(
        work_order_id=work_order_id,
        original_filename=file.filename or "unknown",
        stored_filename=stored_name,
        label=label,
        mime_type=file.content_type or "image/jpeg",
        file_size=len(contents),
        uploaded_by_id=user.id,
    )
    db.add(img)

    if label.strip():
        existing = await db.execute(
            select(LabelSuggestion).where(LabelSuggestion.label == label.strip())
        )
        ls = existing.scalar_one_or_none()
        if ls:
            ls.usage_count += 1
        else:
            ls = LabelSuggestion(label=label.strip())
            db.add(ls)

    await db.commit()
    await db.refresh(img)
    return ImageAttachmentResponse.model_validate(img)


@router.get("/work-order/{work_order_id}", response_model=List[ImageAttachmentResponse])
async def list_images(
    work_order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImageAttachment).where(ImageAttachment.work_order_id == work_order_id)
        .order_by(ImageAttachment.uploaded_at.desc())
    )
    return [ImageAttachmentResponse.model_validate(img) for img in result.scalars().all()]


@router.delete("/{image_id}", status_code=204)
async def delete_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(ImageAttachment).where(ImageAttachment.id == image_id))
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    file_path = os.path.join(UPLOAD_DIR, img.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(img)
    await db.commit()


@router.patch("/{image_id}/label", response_model=ImageAttachmentResponse)
async def update_image_label(
    image_id: uuid.UUID,
    body: ImageUpdateLabel,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(ImageAttachment).where(ImageAttachment.id == image_id))
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    img.label = body.label
    await db.commit()
    await db.refresh(img)
    return ImageAttachmentResponse.model_validate(img)


@router.get("/labels", response_model=List[str])
async def get_label_suggestions(
    q: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(LabelSuggestion).order_by(LabelSuggestion.usage_count.desc())
    if q:
        query = query.where(LabelSuggestion.label.ilike(f"%{q}%"))
    result = await db.execute(query)
    labels = result.scalars().all()
    return [l.label for l in labels]


@router.post("/default-labels")
async def seed_default_labels(db: AsyncSession = Depends(get_db)):
    defaults = [
        "Before", "After", "Equipment Photo", "Damage",
        "Signature", "Site Access", "Install Location", "Serial Number Plate",
    ]
    count = 0
    for label in defaults:
        existing = await db.execute(select(LabelSuggestion).where(LabelSuggestion.label == label))
        if not existing.scalar_one_or_none():
            db.add(LabelSuggestion(label=label, usage_count=1))
            count += 1
    await db.commit()
    return {"created": count}
