"""add is_admin and last_active_at to users

Revision ID: 011
Revises: 010
Create Date: 2024-01-01 00:00:11.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("last_active_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_active_at")
    op.drop_column("users", "is_admin")
