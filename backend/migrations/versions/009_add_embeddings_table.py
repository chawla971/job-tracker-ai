"""add embeddings table

Revision ID: 009
Revises: 008
Create Date: 2024-01-01 00:00:08.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create table using raw SQL so we can use the vector type directly.
    # pgvector extension was already enabled in migration 001.
    op.execute("""
        CREATE TABLE embeddings (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_type VARCHAR NOT NULL,
            source_id   UUID NOT NULL,
            chunk_index INTEGER NOT NULL DEFAULT 0,
            chunk_text  TEXT NOT NULL,
            embedding   vector(384),
            created_at  TIMESTAMP NOT NULL DEFAULT now()
        )
    """)

    # HNSW index for fast approximate nearest-neighbour search.
    # Cosine distance is standard for sentence-transformer embeddings.
    # Unlike IVFFlat, HNSW doesn't require data to exist first.
    op.execute("""
        CREATE INDEX embeddings_embedding_hnsw_idx
        ON embeddings
        USING hnsw (embedding vector_cosine_ops)
    """)

    # Regular index so lookups by source are fast
    op.execute("""
        CREATE INDEX embeddings_source_idx
        ON embeddings (source_type, source_id)
    """)


def downgrade() -> None:
    op.drop_table("embeddings")
