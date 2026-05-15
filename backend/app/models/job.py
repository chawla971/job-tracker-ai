import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Text, Date, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class JobStatus(str, enum.Enum):
    saved = "saved"
    applied = "applied"
    networking = "networking"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    company_name = Column(String, nullable=False)
    role_title = Column(String, nullable=False)
    posting_url = Column(String, nullable=True)
    location_remote_status = Column(String, nullable=True)
    jd_text = Column(Text, nullable=True)
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.saved)
    date_applied = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    contacts = relationship("Contact", back_populates="job", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="job", cascade="all, delete-orphan")
