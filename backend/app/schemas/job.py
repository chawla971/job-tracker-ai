from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

from app.models.job import JobStatus


class JDParseRequest(BaseModel):
    text: str


class JDParseResponse(BaseModel):
    company: str
    title: str
    location: str


class JobCreate(BaseModel):
    company_name: str
    role_title: str
    posting_url: Optional[str] = None
    location_remote_status: Optional[str] = None
    jd_text: Optional[str] = None
    status: JobStatus = JobStatus.applied
    date_applied: Optional[date] = None
    notes: Optional[str] = None


class JobUpdate(BaseModel):
    company_name: Optional[str] = None
    role_title: Optional[str] = None
    posting_url: Optional[str] = None
    location_remote_status: Optional[str] = None
    jd_text: Optional[str] = None
    status: Optional[JobStatus] = None
    date_applied: Optional[date] = None
    notes: Optional[str] = None


class JobResponse(BaseModel):
    id: UUID
    company_name: str
    role_title: str
    posting_url: Optional[str]
    location_remote_status: Optional[str]
    jd_text: Optional[str]
    status: JobStatus
    date_applied: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobDetailResponse(JobResponse):
    """Extended response for the job detail page — includes linked entities."""
    contacts: List["ContactWithChats"] = []
    interviews: List["InterviewResponse"] = []

    class Config:
        from_attributes = True


# Deferred imports to avoid circular dependencies
from app.schemas.contact import ContactWithChats  # noqa: E402
from app.schemas.interview import InterviewResponse  # noqa: E402

JobDetailResponse.model_rebuild()
