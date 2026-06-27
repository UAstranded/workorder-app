from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class LabelSuggestionResponse(BaseModel):
    id: uuid.UUID
    label: str
    usage_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ImageAttachmentResponse(BaseModel):
    id: uuid.UUID
    work_order_id: uuid.UUID
    original_filename: str
    stored_filename: str
    label: Optional[str]
    mime_type: Optional[str]
    file_size: Optional[int]
    uploaded_at: datetime
    uploaded_by_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


class ImageUpdateLabel(BaseModel):
    label: str
