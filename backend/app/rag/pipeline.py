from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.embedding import Embedding, SourceType
from app.rag.chunker import chunk_text
from app.rag.embedder import embed_texts


def embed_and_store(
    db: Session,
    source_type: SourceType,
    source_id: UUID,
    text: Optional[str],
    user_id: Optional[UUID] = None,
) -> None:
    """
    Core pipeline function called by every service that saves embeddable text.

    Steps:
    1. Delete any existing embeddings for this source (handles edits cleanly)
    2. If text is empty/None, stop here — nothing to embed
    3. Chunk the text
    4. Generate embeddings for all chunks in one batch
    5. Insert embedding rows

    Called synchronously — adds ~100-300ms per save depending on text length.
    Fine for a single-user app; would move to a background queue for multi-user.
    """
    # Step 1: always clear stale embeddings first
    _delete_embeddings(db, source_type, source_id)

    if not text or not text.strip():
        db.commit()
        return

    # Step 2: chunk
    chunks = chunk_text(text)
    if not chunks:
        db.commit()
        return

    # Step 3: embed all chunks in a single batch call
    vectors = embed_texts(chunks)

    # Step 4: insert rows
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        db.add(Embedding(
            source_type=source_type,
            source_id=source_id,
            chunk_index=i,
            chunk_text=chunk,
            embedding=vector,
            user_id=user_id,
        ))

    db.commit()


def _delete_embeddings(db: Session, source_type: SourceType, source_id: UUID) -> None:
    db.query(Embedding).filter(
        Embedding.source_type == source_type,
        Embedding.source_id == source_id,
    ).delete()
