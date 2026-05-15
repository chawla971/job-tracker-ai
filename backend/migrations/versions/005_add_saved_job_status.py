"""add saved job status

Revision ID: 005
Revises: 004
Create Date: 2024-01-01 00:00:04.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL allows adding enum values but not at a specific position —
    # 'saved' will appear after 'rejected' internally but that doesn't affect
    # application logic since we never rely on enum sort order.
    op.execute("ALTER TYPE jobstatus ADD VALUE IF NOT EXISTS 'saved'")


def downgrade() -> None:
    # Removing an enum value requires recreating the type. Since this is a
    # dev environment and no rows should have status='saved' at downgrade time,
    # we recreate the enum without it.
    op.execute("""
        ALTER TABLE jobs ALTER COLUMN status TYPE varchar
        USING status::varchar;
    """)
    op.execute("DROP TYPE jobstatus")
    op.execute("""
        CREATE TYPE jobstatus AS ENUM
        ('applied', 'networking', 'interviewing', 'offer', 'rejected')
    """)
    op.execute("""
        ALTER TABLE jobs ALTER COLUMN status TYPE jobstatus
        USING status::jobstatus;
    """)
