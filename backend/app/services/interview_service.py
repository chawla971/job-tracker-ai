from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.models.interview import Interview
from app.models.job import Job, JobStatus
from app.models.embedding import SourceType
from app.schemas.interview import InterviewCreate, InterviewUpdate
from app.rag.pipeline import embed_and_store
from app.rag.embed_helpers import embed_if_updated

_PRE_INTERVIEW_STATUSES = {JobStatus.saved, JobStatus.applied, JobStatus.networking}


def get_interviews(db: Session, user_id: UUID, job_id: Optional[UUID] = None) -> List[Interview]:
    query = db.query(Interview).filter(Interview.user_id == user_id)
    if job_id:
        query = query.filter(Interview.job_id == job_id)
    return query.order_by(Interview.date_time.asc()).all()


def get_interview(db: Session, interview_id: UUID, user_id: UUID) -> Optional[Interview]:
    return db.query(Interview).filter(Interview.id == interview_id, Interview.user_id == user_id).first()


def create_interview(db: Session, interview_data: InterviewCreate, user_id: UUID) -> Interview:
    interview = Interview(**interview_data.model_dump(), user_id=user_id)
    db.add(interview)
    db.commit()
    db.refresh(interview)

    job = db.query(Job).filter(Job.id == interview.job_id, Job.user_id == user_id).first()
    if job and job.status in _PRE_INTERVIEW_STATUSES:
        job.status = JobStatus.interviewing
        db.commit()

    if interview.prep_notes:
        embed_and_store(db, SourceType.interview_prep, interview.id, interview.prep_notes, user_id=user_id)
    if interview.post_interview_notes:
        embed_and_store(db, SourceType.interview_post, interview.id, interview.post_interview_notes, user_id=user_id)
    return interview


def update_interview(db: Session, interview_id: UUID, interview_data: InterviewUpdate, user_id: UUID) -> Optional[Interview]:
    interview = get_interview(db, interview_id, user_id)
    if not interview:
        return None
    updates = interview_data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    embed_if_updated(db, updates, "prep_notes", SourceType.interview_prep, interview.id, interview.prep_notes, user_id)
    embed_if_updated(db, updates, "post_interview_notes", SourceType.interview_post, interview.id, interview.post_interview_notes, user_id)
    return interview


def delete_interview(db: Session, interview_id: UUID, user_id: UUID) -> bool:
    interview = get_interview(db, interview_id, user_id)
    if not interview:
        return False
    db.delete(interview)
    db.commit()
    return True
