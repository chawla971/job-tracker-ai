from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.embedding import Embedding, SourceType
from app.rag.embedder import embed_texts


class SearchResult:
    def __init__(self, source_type: str, source_id: str, chunk_index: int,
                 chunk_text: str, distance: float):
        self.source_type = source_type
        self.source_id = source_id
        self.chunk_index = chunk_index
        self.chunk_text = chunk_text
        self.distance = distance


def similarity_search(
    db: Session,
    query: str,
    top_k: int = 5,
    source_type_filter: Optional[SourceType] = None,
    user_id=None,
) -> List[SearchResult]:
    """
    Embed the query, then find the top-k most similar chunks in pgvector.

    Uses cosine distance (<=> operator). Lower distance = more similar.
    Returns results ordered by similarity (closest first).
    """
    if not query or not query.strip():
        return []

    query_vector = embed_texts([query.strip()])[0]

    distance_expr = Embedding.embedding.cosine_distance(query_vector)
    RELEVANCE_THRESHOLD = 0.5

    # All filters must come before .limit() — SQLAlchemy raises if filter()
    # is called after limit() or offset() has already been applied.
    q = db.query(Embedding, distance_expr.label("distance")).filter(
        distance_expr < RELEVANCE_THRESHOLD
    )
    if source_type_filter:
        q = q.filter(Embedding.source_type == source_type_filter)
    if user_id is not None:
        q = q.filter(Embedding.user_id == user_id)

    rows = q.order_by("distance").limit(top_k).all()

    return [
        SearchResult(
            source_type=emb.source_type,
            source_id=str(emb.source_id),
            chunk_index=emb.chunk_index,
            chunk_text=emb.chunk_text,
            distance=float(dist),
        )
        for emb, dist in rows
    ]
