from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import List
from uuid import UUID

from app.models.job import Job, JobStatus
from app.models.contact import Contact, ContactStatus
from app.models.coffee_chat import CoffeeChat
from app.models.interview import Interview
from app.schemas.dashboard import (
    DashboardResponse, StatusCount, UpcomingInterview,
    UpcomingCoffeeChat, OverdueFollowUp, ActivityItem,
)


def get_dashboard(db: Session, user_id: UUID) -> DashboardResponse:
    today = date.today()
    now = datetime.utcnow()
    week_ago = today - timedelta(days=7)
    next_7_days = now + timedelta(days=7)

    upcoming_interviews_raw = (
        db.query(Interview, Job.company_name, Job.role_title)
        .join(Job, Interview.job_id == Job.id)
        .filter(Interview.user_id == user_id, Interview.date_time >= now, Interview.date_time <= next_7_days)
        .order_by(Interview.date_time.asc())
        .all()
    )
    upcoming_interviews = [
        UpcomingInterview(id=i.id, job_id=i.job_id, company_name=cn, role_title=rt, round_type=i.round_type, date_time=i.date_time)
        for i, cn, rt in upcoming_interviews_raw
    ]

    upcoming_chats_raw = (
        db.query(CoffeeChat, Contact.name, Contact.company)
        .join(Contact, CoffeeChat.contact_id == Contact.id)
        .filter(CoffeeChat.user_id == user_id, CoffeeChat.date_time >= now, CoffeeChat.date_time <= next_7_days)
        .order_by(CoffeeChat.date_time.asc())
        .all()
    )
    upcoming_coffee_chats = [
        UpcomingCoffeeChat(id=c.id, contact_id=c.contact_id, contact_name=cn, company=co, date_time=c.date_time, meeting_link=c.meeting_link)
        for c, cn, co in upcoming_chats_raw
    ]

    overdue_raw = (
        db.query(Contact)
        .filter(Contact.user_id == user_id, Contact.follow_up_date < today, Contact.status != ContactStatus.chat_done)
        .order_by(Contact.follow_up_date.asc())
        .all()
    )
    overdue_follow_ups = [
        OverdueFollowUp(id=c.id, name=c.name, company=c.company, follow_up_date=c.follow_up_date.isoformat(), status=c.status, job_id=c.job_id)
        for c in overdue_raw
    ]

    status_counts_raw = (
        db.query(Job.status, func.count(Job.id))
        .filter(Job.user_id == user_id)
        .group_by(Job.status)
        .all()
    )
    counts_map = {row[0]: row[1] for row in status_counts_raw}
    status_counts = [StatusCount(status=s, count=counts_map.get(s, 0)) for s in JobStatus]

    jobs_this_week = (
        db.query(func.count(Job.id))
        .filter(Job.user_id == user_id, Job.date_applied >= week_ago)
        .scalar()
    ) or 0

    total_active = (
        db.query(func.count(Job.id))
        .filter(Job.user_id == user_id, Job.status.notin_([JobStatus.offer, JobStatus.rejected]))
        .scalar()
    ) or 0

    recent_activity = _get_recent_activity(db, user_id)
    return DashboardResponse(
        upcoming_interviews=upcoming_interviews, upcoming_coffee_chats=upcoming_coffee_chats,
        overdue_follow_ups=overdue_follow_ups, status_counts=status_counts,
        jobs_this_week=jobs_this_week, total_active=total_active, recent_activity=recent_activity,
    )


def _get_recent_activity(db: Session, user_id: UUID, limit: int = 5) -> List[ActivityItem]:
    # Fetch the most recent `limit` rows from each entity type, then merge and
    # re-sort in Python. Four queries is acceptable here — a UNION across four
    # tables with different columns would be harder to read and maintain.
    jobs = db.query(Job).filter(Job.user_id == user_id).order_by(Job.created_at.desc()).limit(limit).all()
    contacts = db.query(Contact).filter(Contact.user_id == user_id).order_by(Contact.created_at.desc()).limit(limit).all()
    interviews = (
        db.query(Interview, Job.company_name)
        .join(Job, Interview.job_id == Job.id)
        .filter(Interview.user_id == user_id)
        .order_by(Interview.created_at.desc())
        .limit(limit)
        .all()
    )
    chats = (
        db.query(CoffeeChat, Contact.name)
        .join(Contact, CoffeeChat.contact_id == Contact.id)
        .filter(CoffeeChat.user_id == user_id)
        .order_by(CoffeeChat.created_at.desc())
        .limit(limit)
        .all()
    )

    activities: List[ActivityItem] = (
        [ActivityItem(type="job", label=f"Added {j.company_name}", sub_label=j.role_title, timestamp=j.created_at, entity_id=str(j.id)) for j in jobs]
        + [ActivityItem(type="contact", label=f"Added {c.name}", sub_label=c.company or "", timestamp=c.created_at, entity_id=str(c.id)) for c in contacts]
        + [ActivityItem(type="interview", label=f"Interview at {cn}", sub_label=iv.round_type, timestamp=iv.created_at, entity_id=str(iv.id)) for iv, cn in interviews]
        + [ActivityItem(type="coffee_chat", label=f"Coffee chat with {cn}", sub_label="", timestamp=chat.created_at, entity_id=str(chat.id)) for chat, cn in chats]
    )
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:limit]
