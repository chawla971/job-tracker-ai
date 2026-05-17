from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.interview import Interview
from app.models.coffee_chat import CoffeeChat
from app.models.contact import Contact
from app.models.job import Job
from app.models.user import User
from app.core.dependencies import get_current_user

router = APIRouter()

CALENDAR_WINDOW_DAYS = 60


class CalendarEvent(BaseModel):
    date: str        # "YYYY-MM-DD"
    type: str        # "interview" | "coffee_chat"
    label: str
    start_iso: str   # full ISO for calendar URL generation on frontend


class CalendarEventsResponse(BaseModel):
    events: List[CalendarEvent]


@router.get("/events", response_model=CalendarEventsResponse)
def get_calendar_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CalendarEventsResponse:
    now = datetime.utcnow()
    end = now + timedelta(days=CALENDAR_WINDOW_DAYS)

    interviews = (
        db.query(Interview, Job.company_name, Job.role_title)
        .join(Job, Interview.job_id == Job.id)
        .filter(Interview.user_id == current_user.id, Interview.date_time >= now, Interview.date_time <= end)
        .order_by(Interview.date_time)
        .all()
    )

    chats = (
        db.query(CoffeeChat, Contact.name, Contact.company)
        .join(Contact, CoffeeChat.contact_id == Contact.id)
        .filter(CoffeeChat.user_id == current_user.id, CoffeeChat.date_time >= now, CoffeeChat.date_time <= end)
        .order_by(CoffeeChat.date_time)
        .all()
    )

    events: List[CalendarEvent] = [
        CalendarEvent(
            date=iv.date_time.strftime("%Y-%m-%d"),
            type="interview",
            label=f"{company_name} — {role_title} ({iv.round_type})",
            start_iso=iv.date_time.isoformat(),
        )
        for iv, company_name, role_title in interviews
    ] + [
        CalendarEvent(
            date=chat.date_time.strftime("%Y-%m-%d"),
            type="coffee_chat",
            label=f"Coffee chat with {contact_name}" + (f" ({company})" if company else ""),
            start_iso=chat.date_time.isoformat(),
        )
        for chat, contact_name, company in chats
    ]

    return CalendarEventsResponse(events=events)
