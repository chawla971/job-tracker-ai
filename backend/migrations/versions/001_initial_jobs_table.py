"""initial jobs table

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension now so Phase 4 doesn't need a separate migration
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_name", sa.String(), nullable=False),
        sa.Column("role_title", sa.String(), nullable=False),
        sa.Column("posting_url", sa.String(), nullable=True),
        sa.Column("location_remote_status", sa.String(), nullable=True),
        sa.Column("jd_text", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "applied", "networking", "interviewing", "offer", "rejected",
                name="jobstatus",
                create_type=True,  # let SQLAlchemy own the CREATE TYPE
            ),
            nullable=False,
            server_default="applied",
        ),
        sa.Column("date_applied", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.execute("DROP TYPE jobstatus")
