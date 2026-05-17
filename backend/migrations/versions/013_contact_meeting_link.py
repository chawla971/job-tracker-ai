"""add meeting_link to contacts

Revision ID: 013
Revises: 012
Create Date: 2024-01-01 00:00:13.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contacts", sa.Column("meeting_link", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("contacts", "meeting_link")
