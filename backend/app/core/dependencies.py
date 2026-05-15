import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_jwt
from app.models.user import User

_ACTIVE_DEBOUNCE = timedelta(minutes=5)


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated. Please sign in.")
    token = authorization.split(" ", 1)[1]
    payload = verify_jwt(token)
    user = db.query(User).filter(User.id == uuid.UUID(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please sign in again.")

    # Stamp last_active_at at most once every 5 minutes to avoid a DB write on every request
    now = datetime.utcnow()
    if user.last_active_at is None or (now - user.last_active_at) > _ACTIVE_DEBOUNCE:
        user.last_active_at = now
        db.commit()

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user
