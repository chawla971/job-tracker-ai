from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.job import Job
from app.core.dependencies import require_admin

router = APIRouter()


class AdminStats(BaseModel):
    total_users: int
    new_users_this_week: int
    total_jobs: int
    daily_active_users: int


class AdminUser(BaseModel):
    id: str
    name: str
    email: str
    is_admin: bool
    job_count: int
    created_at: datetime
    last_active_at: Optional[datetime]


@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AdminStats:
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(User).count()
    new_users_this_week = db.query(User).filter(User.created_at >= week_ago).count()
    total_jobs = db.query(Job).count()
    daily_active_users = db.query(User).filter(User.last_active_at >= today_start).count()

    return AdminStats(
        total_users=total_users,
        new_users_this_week=new_users_this_week,
        total_jobs=total_jobs,
        daily_active_users=daily_active_users,
    )


@router.get("/users", response_model=List[AdminUser])
def get_users(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> List[AdminUser]:
    rows = (
        db.query(User, func.count(Job.id).label("job_count"))
        .outerjoin(Job, Job.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
        .all()
    )
    return [
        AdminUser(
            id=str(user.id),
            name=user.name,
            email=user.email,
            is_admin=user.is_admin,
            job_count=job_count,
            created_at=user.created_at,
            last_active_at=user.last_active_at,
        )
        for user, job_count in rows
    ]
