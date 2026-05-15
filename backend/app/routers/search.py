from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.embedding import SourceType
from app.models.user import User
from app.rag.search import similarity_search
from app.schemas.search import SearchResponse, SearchResultItem
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=SearchResponse)
def search(
    q: str = Query(...),
    top_k: int = Query(5, ge=1, le=20),
    source_type: Optional[SourceType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = similarity_search(db, q, top_k=top_k, source_type_filter=source_type, user_id=current_user.id)
    return SearchResponse(
        query=q,
        results=[
            SearchResultItem(source_type=r.source_type, source_id=r.source_id, chunk_index=r.chunk_index, chunk_text=r.chunk_text, distance=r.distance)
            for r in results
        ],
    )
