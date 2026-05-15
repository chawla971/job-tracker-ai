from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
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
