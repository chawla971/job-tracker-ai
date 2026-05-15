from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, timedelta
from uuid import UUID

from app.models.contact import Contact, ContactStatus
from app.schemas.contact import ContactCreate, ContactUpdate


def get_contacts(
    db: Session,
    user_id: UUID,
    status: Optional[ContactStatus] = None,
    overdue_only: bool = False,
    job_id: Optional[UUID] = None,
) -> List[Contact]:
    query = db.query(Contact).filter(Contact.user_id == user_id)
    if status:
        query = query.filter(Contact.status == status)
    if overdue_only:
        query = query.filter(
            Contact.follow_up_date < date.today(),
            Contact.status != ContactStatus.chat_done,
        )
    if job_id:
        query = query.filter(Contact.job_id == job_id)
    return query.order_by(Contact.created_at.desc()).all()


def get_contact(db: Session, contact_id: UUID, user_id: UUID) -> Optional[Contact]:
    return (
        db.query(Contact)
        .options(joinedload(Contact.coffee_chats))
        .filter(Contact.id == contact_id, Contact.user_id == user_id)
        .first()
    )


def create_contact(db: Session, contact_data: ContactCreate, user_id: UUID) -> Contact:
    data = contact_data.model_dump()
    if (
        data.get("follow_up_date") is None
        and data.get("outreach_date")
        and data.get("status") != ContactStatus.chat_done
    ):
        data["follow_up_date"] = data["outreach_date"] + timedelta(days=5)
    contact = Contact(**data, user_id=user_id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def update_contact(db: Session, contact_id: UUID, contact_data: ContactUpdate, user_id: UUID) -> Optional[Contact]:
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == user_id).first()
    if not contact:
        return None
    updates = contact_data.model_dump(exclude_unset=True)
    if updates.get("status") == ContactStatus.chat_done and "follow_up_date" not in updates:
        updates["follow_up_date"] = None
    for field, value in updates.items():
        setattr(contact, field, value)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: UUID, user_id: UUID) -> bool:
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == user_id).first()
    if not contact:
        return False
    db.delete(contact)
    db.commit()
    return True
