"""add contacts table

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("linkedin_url", sa.String(), nullable=True),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("outreach_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "reached_out", "responded", "chat_scheduled", "chat_done",
                name="contactstatus",
                create_type=True,
            ),
            nullable=False,
            server_default="reached_out",
        ),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
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
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("contacts")
    op.execute("DROP TYPE contactstatus")
