import uuid
import enum
from datetime import datetime, date

from sqlalchemy import Column, String, Date, DateTime, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ContactStatus(str, enum.Enum):
    awaiting_response = "awaiting_response"
    responded = "responded"
    chat_scheduled = "chat_scheduled"
    chat_done = "chat_done"


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    linkedin_url = Column(String, nullable=True)
    company = Column(String, nullable=True)
    meeting_link = Column(String, nullable=True)
    outreach_date = Column(Date, nullable=False)
    status = Column(Enum(ContactStatus), nullable=False, default=ContactStatus.awaiting_response)
    follow_up_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    job = relationship("Job", back_populates="contacts")
    coffee_chats = relationship("CoffeeChat", back_populates="contact", cascade="all, delete-orphan")

    @property
    def is_overdue(self) -> bool:
        return (
            self.follow_up_date is not None
            and self.follow_up_date < date.today()
            and self.status != ContactStatus.chat_done
        )
