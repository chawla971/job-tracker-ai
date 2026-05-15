from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.models.job import JobStatus
from app.models.contact import ContactStatus


class StatusCount(BaseModel):
    status: JobStatus
    count: int


class UpcomingInterview(BaseModel):
    id: UUID
    job_id: UUID
    company_name: str
    role_title: str
    round_type: str
    date_time: datetime


class UpcomingCoffeeChat(BaseModel):
    id: UUID
    contact_id: UUID
    contact_name: str
    company: Optional[str]
    date_time: datetime
    meeting_link: Optional[str]


class OverdueFollowUp(BaseModel):
    id: UUID
    name: str
    company: Optional[str]
    follow_up_date: str
    status: ContactStatus
    job_id: Optional[UUID]


class ActivityItem(BaseModel):
    type: str
    label: str
    sub_label: str
    timestamp: datetime
    entity_id: str


class DashboardResponse(BaseModel):
    upcoming_interviews: List[UpcomingInterview]
    upcoming_coffee_chats: List[UpcomingCoffeeChat]
    overdue_follow_ups: List[OverdueFollowUp]
    status_counts: List[StatusCount]
    jobs_this_week: int
    total_active: int
    recent_activity: List[ActivityItem]
