from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.security import create_jwt, verify_jwt
from app.core.dependencies import get_current_user
from app.config import settings

router = APIRouter()


class GoogleTokenRequest(BaseModel):
    credential: str  # Google ID token from the frontend


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None
    is_admin: bool = False


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


def _claim_orphaned_data(db: Session, user_id: UUID) -> None:
    """
    On first login, assign any rows with user_id=NULL to this user.
    This handles the transition from the single-user prototype to multi-user auth.
    """
    from app.models.job import Job
    from app.models.contact import Contact
    from app.models.coffee_chat import CoffeeChat
    from app.models.interview import Interview
    from app.models.user_profile import UserProfile
    from app.models.embedding import Embedding

    for Model in [Job, Contact, CoffeeChat, Interview, UserProfile, Embedding]:
        db.query(Model).filter(Model.user_id.is_(None)).update({"user_id": user_id})
    db.commit()


@router.post("/google", response_model=AuthResponse)
def google_login(data: GoogleTokenRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """
    Verify a Google ID token, create or find the user, return a JWT.
    The frontend sends the credential from @react-oauth/google's onSuccess callback.
    """
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on the server.")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        idinfo = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", email)
    picture = idinfo.get("picture")

    ADMIN_EMAILS = {"sahil971chawla@gmail.com"}

    is_new_user = False
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = User(
            email=email, name=name, google_id=google_id,
            profile_picture_url=picture,
            is_admin=email in ADMIN_EMAILS,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True

    if is_new_user:
        _claim_orphaned_data(db, user.id)

    token = create_jwt(str(user.id), user.email)
    return AuthResponse(
        token=token,
        user=UserResponse(id=str(user.id), email=user.email, name=user.name, picture=user.profile_picture_url, is_admin=user.is_admin),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        picture=current_user.profile_picture_url,
        is_admin=current_user.is_admin,
    )
