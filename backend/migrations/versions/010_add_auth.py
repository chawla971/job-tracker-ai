"""add auth: users table and user_id FK on all data tables

Revision ID: 010
Revises: 009
Create Date: 2024-01-01 00:00:10.000000

user_id columns are nullable so existing data is preserved.
On first login, the auth endpoint claims all NULL-user_id rows for
the signing-in user (_claim_orphaned_data in routers/auth.py).
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Users table ────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String, nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("google_id", sa.String, nullable=False),
        sa.Column("profile_picture_url", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    # ── Add user_id FK to all data tables (nullable for migration safety) ──────
    tables = ["jobs", "contacts", "coffee_chats", "interviews", "user_profile", "embeddings"]
    for table in tables:
        op.add_column(table, sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_user_id", table, "users",
            ["user_id"], ["id"],
            ondelete="CASCADE",
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])


def downgrade() -> None:
    tables = ["jobs", "contacts", "coffee_chats", "interviews", "user_profile", "embeddings"]
    for table in reversed(tables):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id", table, type_="foreignkey")
        op.drop_column(table, "user_id")

    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
