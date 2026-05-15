from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserProfileUpdate(BaseModel):
    resume_text: Optional[str] = None
    about_me: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: UUID
    resume_text: Optional[str]
    about_me: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True
