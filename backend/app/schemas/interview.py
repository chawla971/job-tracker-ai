from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class InterviewCreate(BaseModel):
    job_id: UUID
    round_type: str
    date_time: datetime
    interviewer_name: Optional[str] = None
    prep_notes: Optional[str] = None
    post_interview_notes: Optional[str] = None


class InterviewUpdate(BaseModel):
    round_type: Optional[str] = None
    date_time: Optional[datetime] = None
    interviewer_name: Optional[str] = None
    prep_notes: Optional[str] = None
    post_interview_notes: Optional[str] = None


class InterviewResponse(BaseModel):
    id: UUID
    job_id: UUID
    round_type: str
    date_time: datetime
    interviewer_name: Optional[str]
    prep_notes: Optional[str]
    post_interview_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
