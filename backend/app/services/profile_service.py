from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID

from app.models.user_profile import UserProfile
from app.schemas.user_profile import UserProfileUpdate


def get_or_create_profile(db: Session, user_id: UUID) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def update_profile(db: Session, data: UserProfileUpdate, user_id: UUID) -> UserProfile:
    profile = get_or_create_profile(db, user_id)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return profile
