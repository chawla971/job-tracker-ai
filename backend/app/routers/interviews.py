from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.interview import InterviewCreate, InterviewUpdate, InterviewResponse
from app.services import interview_service
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=List[InterviewResponse])
def list_interviews(job_id: Optional[UUID] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return interview_service.get_interviews(db, current_user.id, job_id=job_id)


@router.post("/", response_model=InterviewResponse, status_code=201)
def create_interview(interview_data: InterviewCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return interview_service.create_interview(db, interview_data, current_user.id)


@router.patch("/{interview_id}", response_model=InterviewResponse)
def update_interview(interview_id: UUID, interview_data: InterviewUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    interview = interview_service.update_interview(db, interview_id, interview_data, current_user.id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.delete("/{interview_id}", status_code=204)
def delete_interview(interview_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = interview_service.delete_interview(db, interview_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Interview not found")
