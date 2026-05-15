from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return dashboard_service.get_dashboard(db, current_user.id)
