import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobDetailResponse, JDParseRequest, JDParseResponse
from app.services import job_service
from app.models.user import User
from app.core.dependencies import get_current_user
from app.core.llm_errors import raise_for_llm_error
from app.core.prompts import EXTRACTION_SYSTEM, JD_FIELD_EXTRACTION_PROMPT

log = logging.getLogger(__name__)
router = APIRouter()


def _embed_jd_inline(db: Session, job_id: UUID, jd_text: str, user_id: UUID) -> None:
    """
    Embed the JD text synchronously in the same DB session.
    Called inline (not as a background task) so it cannot be lost to a server crash.
    Errors are caught and logged — a failed embed never blocks the job save.
    """
    try:
        from app.models.embedding import SourceType
        from app.rag.pipeline import embed_and_store
        log.info("[embed] Embedding JD for job %s (%d chars)", job_id, len(jd_text))
        embed_and_store(db, SourceType.job_jd, job_id, jd_text, user_id=user_id)
        log.info("[embed] JD embedded successfully for job %s", job_id)
    except Exception:
        log.exception("[embed] Failed to embed JD for job %s", job_id)


@router.post("/parse-jd", response_model=JDParseResponse)
async def parse_jd(data: JDParseRequest, current_user: User = Depends(get_current_user)) -> JDParseResponse:
    import json
    from app.llm.base import Message
    from app.llm.factory import get_llm_provider
    if not data.text or len(data.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Job description text is too short to extract from.")
    try:
        llm = get_llm_provider()
        raw = await llm.complete(
            system=EXTRACTION_SYSTEM,
            messages=[Message(role="user", content=JD_FIELD_EXTRACTION_PROMPT.format(text=data.text[:4000]))],
        )
        parsed = json.loads(raw.strip())
        return JDParseResponse(
            company=str(parsed.get("company", "")),
            title=str(parsed.get("title", "")),
            location=str(parsed.get("location", "")),
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned unexpected format. Try again.")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise_for_llm_error(e)


@router.get("/", response_model=List[JobResponse])
def list_jobs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return job_service.get_jobs(db, current_user.id)


@router.post("/", response_model=JobResponse, status_code=201)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.create_job(db, job_data, current_user.id)
    if job.jd_text:
        _embed_jd_inline(db, job.id, job.jd_text, current_user.id)
    return job


@router.get("/{job_id}/detail", response_model=JobDetailResponse)
def get_job_detail(job_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = job_service.get_job_detail(db, job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = job_service.get_job(db, job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.update_job(db, job_id, job_data, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.jd_text:
        _embed_jd_inline(db, job.id, job.jd_text, current_user.id)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = job_service.delete_job(db, job_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
