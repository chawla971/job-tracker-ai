from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class CoffeeChatCreate(BaseModel):
    contact_id: UUID
    date_time: datetime
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class CoffeeChatUpdate(BaseModel):
    date_time: Optional[datetime] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class CoffeeChatResponse(BaseModel):
    id: UUID
    contact_id: UUID
    date_time: datetime
    meeting_link: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
