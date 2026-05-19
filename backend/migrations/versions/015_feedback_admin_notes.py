"""add admin_notes to feedback

Revision ID: 015
Revises: 014
Create Date: 2024-01-01 00:00:15.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("feedback", sa.Column("admin_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("feedback", "admin_notes")
