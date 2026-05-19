import logging
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.embedding import Embedding, SourceType
from app.rag.embedder import embed_texts

log = logging.getLogger(__name__)

_CHUNK_SIZE = 1500  # chars; ~375 tokens — well under OpenAI's 8192 token limit


def _split(text: str) -> list:
    """Fixed-size splitting. Replaces chunk_text to avoid import issues."""
    text = text.strip()
    if not text:
        return []
    return [text[i: i + _CHUNK_SIZE] for i in range(0, len(text), _CHUNK_SIZE)]


def embed_and_store(
    db: Session,
    source_type: SourceType,
    source_id: UUID,
    text: Optional[str],
    user_id: Optional[UUID] = None,
) -> None:
    _delete_embeddings(db, source_type, source_id)
    db.commit()

    if not text or not text.strip():
        return

    chunks = _split(text)
    if not chunks:
        return

    log.info("[pipeline] %s %s → %d chunks", source_type, source_id, len(chunks))

    for i, chunk in enumerate(chunks):
        try:
            vectors = embed_texts([chunk])
            if not vectors:
                log.warning("[pipeline] empty vector for chunk %d", i)
                continue
            db.add(Embedding(
                source_type=source_type,
                source_id=source_id,
                chunk_index=i,
                chunk_text=chunk,
                embedding=vectors[0],
                user_id=user_id,
            ))
            db.commit()
            log.info("[pipeline] chunk %d/%d stored (dim=%d)", i + 1, len(chunks), len(vectors[0]))
        except Exception:
            log.exception("[pipeline] failed on chunk %d", i)
            db.rollback()


def _delete_embeddings(db: Session, source_type: SourceType, source_id: UUID) -> None:
    db.query(Embedding).filter(
        Embedding.source_type == source_type,
        Embedding.source_id == source_id,
    ).delete()
