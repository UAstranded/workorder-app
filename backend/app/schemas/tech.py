from pydantic import BaseModel
from typing import Optional
import uuid


class TechCreate(BaseModel):
    tech_name: str
    sort_order: int = 0


class TechSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    tech_name: str
    sort_order: int = 0

    model_config = {"from_attributes": True}
