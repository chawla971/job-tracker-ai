from pydantic import BaseModel
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from uuid import UUID

from app.models.contact import ContactStatus

if TYPE_CHECKING:
    from app.schemas.coffee_chat import CoffeeChatResponse


class ContactCreate(BaseModel):
    name: str
    job_id: Optional[UUID] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    outreach_date: date
    status: ContactStatus = ContactStatus.awaiting_response
    follow_up_date: Optional[date] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    job_id: Optional[UUID] = None
    linkedin_url: Optional[str] = None
    company: Optional[str] = None
    outreach_date: Optional[date] = None
    status: Optional[ContactStatus] = None
    follow_up_date: Optional[date] = None


class ContactResponse(BaseModel):
    id: UUID
    job_id: Optional[UUID]
    name: str
    linkedin_url: Optional[str]
    company: Optional[str]
    outreach_date: date
    status: ContactStatus
    follow_up_date: Optional[date]
    is_overdue: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContactWithChats(ContactResponse):
    coffee_chats: List["CoffeeChatResponse"] = []

    class Config:
        from_attributes = True


from app.schemas.coffee_chat import CoffeeChatResponse  # noqa: E402
ContactWithChats.model_rebuild()
