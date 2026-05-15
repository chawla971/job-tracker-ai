from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID

from app.models.job import Job
from app.models.contact import Contact


def get_jobs(db: Session, user_id: UUID) -> List[Job]:
    return db.query(Job).filter(Job.user_id == user_id).order_by(Job.created_at.desc()).all()


def get_job(db: Session, job_id: UUID, user_id: UUID) -> Optional[Job]:
    return db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()


def get_job_detail(db: Session, job_id: UUID, user_id: UUID) -> Optional[Job]:
    return (
        db.query(Job)
        .options(
            joinedload(Job.contacts).joinedload(Contact.coffee_chats),
            joinedload(Job.interviews),
        )
        .filter(Job.id == job_id, Job.user_id == user_id)
        .first()
    )


def create_job(db: Session, job_data, user_id: UUID) -> Job:
    job = Job(**job_data.model_dump(), user_id=user_id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_job(db: Session, job_id: UUID, job_data, user_id: UUID) -> Optional[Job]:
    job = get_job(db, job_id, user_id)
    if not job:
        return None
    updates = job_data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


def delete_job(db: Session, job_id: UUID, user_id: UUID) -> bool:
    job = get_job(db, job_id, user_id)
    if not job:
        return False
    db.delete(job)
    db.commit()
    return True
