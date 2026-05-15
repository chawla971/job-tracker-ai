"""
Shared helpers for conditionally re-embedding fields after an update.
Both interview_service and coffee_chat_service follow the same pattern:
re-embed a text field only when it was included in the update payload.
"""
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.embedding import SourceType
from app.rag.pipeline import embed_and_store


def embed_if_updated(
    db: Session,
    updates: dict,
    field: str,
    source_type: SourceType,
    source_id: UUID,
    text_value,
    user_id: UUID,
) -> None:
    if field in updates:
        embed_and_store(db, source_type, source_id, text_value, user_id=user_id)
