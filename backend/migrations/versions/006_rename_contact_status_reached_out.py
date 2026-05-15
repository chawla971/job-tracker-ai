"""rename reached_out to awaiting_response in contactstatus

Revision ID: 006
Revises: 005
Create Date: 2024-01-01 00:00:05.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE contactstatus RENAME VALUE 'reached_out' TO 'awaiting_response'")


def downgrade() -> None:
    op.execute("ALTER TYPE contactstatus RENAME VALUE 'awaiting_response' TO 'reached_out'")
