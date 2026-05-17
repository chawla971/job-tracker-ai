from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.feedback import Feedback, FeedbackType, FeedbackStatus
from app.models.user import User
from app.core.dependencies import get_current_user, require_admin

router = APIRouter()


class FeedbackCreate(BaseModel):
    type: FeedbackType
    description: str


class FeedbackResponse(BaseModel):
    id: str
    type: FeedbackType
    description: str
    status: FeedbackStatus
    created_at: datetime
    user_email: str | None = None


@router.post("", response_model=FeedbackResponse, status_code=201)
@router.post("/", response_model=FeedbackResponse, status_code=201)
def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackResponse:
    fb = Feedback(user_id=current_user.id, type=data.type, description=data.description)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return FeedbackResponse(id=str(fb.id), type=fb.type, description=fb.description, status=fb.status, created_at=fb.created_at)


@router.get("/admin", response_model=List[FeedbackResponse])
def list_feedback(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> List[FeedbackResponse]:
    rows = (
        db.query(Feedback, User.email)
        .outerjoin(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    return [
        FeedbackResponse(id=str(fb.id), type=fb.type, description=fb.description, status=fb.status, created_at=fb.created_at, user_email=email)
        for fb, email in rows
    ]


@router.patch("/{feedback_id}/status")
def update_status(
    feedback_id: UUID,
    status: FeedbackStatus,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if fb:
        fb.status = status
        db.commit()
    return {"ok": True}
