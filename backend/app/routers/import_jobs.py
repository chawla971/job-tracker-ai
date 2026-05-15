from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.import_service import (
    build_preview,
    confirm_import,
    ImportConfirmRequest,
    ImportPreviewResponse,
    ImportSummary,
    TEMPLATE_CSV,
)

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/template")
def download_template(current_user: User = Depends(get_current_user)) -> Response:
    """Return a CSV template with headers + two example rows."""
    return Response(
        content=TEMPLATE_CSV,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="job_tracker_template.csv"'},
    )


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportPreviewResponse:
    """Parse the uploaded file and return a preview without writing to the DB."""
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .csv, .xlsx, and .xls files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File is too large. Maximum size is 5 MB.")

    try:
        return build_preview(content, file.filename or "file.csv", db, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")


@router.post("/confirm", response_model=ImportSummary)
def confirm_import_endpoint(
    request: ImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportSummary:
    """Import the (possibly user-edited) rows into the database."""
    return confirm_import(request, db, current_user.id)
