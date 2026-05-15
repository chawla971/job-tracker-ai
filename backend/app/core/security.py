from datetime import datetime, timedelta
from uuid import UUID

from jose import JWTError, jwt
from fastapi import HTTPException

from app.config import settings

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30


def create_jwt(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
        settings.jwt_secret_key,
        algorithm=ALGORITHM,
    )


def verify_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please sign in again.")
