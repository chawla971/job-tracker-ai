import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, Text, DateTime, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector

from app.database import Base


class SourceType(str, enum.Enum):
    job_jd = "job_jd"
    coffee_chat_notes = "coffee_chat_notes"
    interview_prep = "interview_prep"
    interview_post = "interview_post"
    user_resume = "user_resume"
    user_about = "user_about"


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    source_type = Column(String, nullable=False)
    source_id = Column(UUID(as_uuid=True), nullable=False)
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text = Column(Text, nullable=False)
    # 1536 dimensions — matches OpenAI text-embedding-3-small
    embedding = Column(Vector(1536), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
