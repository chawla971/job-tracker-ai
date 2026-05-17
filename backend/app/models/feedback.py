import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class FeedbackType(str, enum.Enum):
    bug = "bug"
    feature = "feature"
    other = "other"


class FeedbackStatus(str, enum.Enum):
    open = "open"
    reviewed = "reviewed"
    resolved = "resolved"


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(Enum(FeedbackType), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(FeedbackStatus), nullable=False, default=FeedbackStatus.open)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
