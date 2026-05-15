from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.user import User
from app.schemas.user_profile import UserProfileUpdate, UserProfileResponse
from app.services import profile_service
from app.rag.parser import parse_document
from app.core.dependencies import get_current_user

router = APIRouter(redirect_slashes=False)


def _embed_profile_background(profile_id: str, resume_text, about_me, user_id: str) -> None:
    import logging
    import uuid
    from app.models.embedding import SourceType
    from app.rag.pipeline import embed_and_store
    db = SessionLocal()
    try:
        uid = uuid.UUID(user_id)
        pid = uuid.UUID(profile_id)
        if resume_text is not None:
            embed_and_store(db, SourceType.user_resume, pid, resume_text, user_id=uid)
        if about_me is not None:
            embed_and_store(db, SourceType.user_about, pid, about_me, user_id=uid)
    except Exception:
        logging.getLogger(__name__).exception("[embed] Failed to embed profile %s", profile_id)
    finally:
        db.close()


@router.get("")
@router.get("/")
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> UserProfileResponse:
    return profile_service.get_or_create_profile(db, current_user.id)


@router.put("")
@router.put("/")
def update_profile(
    data: UserProfileUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileResponse:
    profile = profile_service.update_profile(db, data, current_user.id)
    background_tasks.add_task(
        _embed_profile_background,
        str(profile.id),
        profile.resume_text if "resume_text" in data.model_fields_set else None,
        profile.about_me if "about_me" in data.model_fields_set else None,
        str(current_user.id),
    )
    return profile


@router.post("/resume/upload")
@router.post("/resume/upload/")
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileResponse:
    resume_text = await parse_document(file)
    profile = profile_service.update_profile(db, UserProfileUpdate(resume_text=resume_text), current_user.id)
    background_tasks.add_task(_embed_profile_background, str(profile.id), resume_text, None, str(current_user.id))
    return profile
