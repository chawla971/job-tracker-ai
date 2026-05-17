"""switch embeddings to OpenAI text-embedding-3-small (1536 dims)

Revision ID: 012
Revises: 011
Create Date: 2024-01-01 00:00:12.000000

Drops the old 384-dim HNSW index and column, adds a 1536-dim column and
new index. All existing embeddings are deleted — run backfill_embeddings.py
after deploying to re-embed all data with the new model.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear all existing embeddings — they were produced by the old model
    # and are incompatible with the new 1536-dim space.
    op.execute("DELETE FROM embeddings")

    # Drop old index and column
    op.execute("DROP INDEX IF EXISTS embeddings_embedding_hnsw_idx")
    op.execute("ALTER TABLE embeddings DROP COLUMN IF EXISTS embedding")

    # Add new 1536-dim column and HNSW index
    op.execute("ALTER TABLE embeddings ADD COLUMN embedding vector(1536)")
    op.execute("""
        CREATE INDEX embeddings_embedding_hnsw_idx
        ON embeddings
        USING hnsw (embedding vector_cosine_ops)
    """)


def downgrade() -> None:
    op.execute("DELETE FROM embeddings")
    op.execute("DROP INDEX IF EXISTS embeddings_embedding_hnsw_idx")
    op.execute("ALTER TABLE embeddings DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE embeddings ADD COLUMN embedding vector(384)")
    op.execute("""
        CREATE INDEX embeddings_embedding_hnsw_idx
        ON embeddings USING hnsw (embedding vector_cosine_ops)
    """)
