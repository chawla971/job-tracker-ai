from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models.contact import ContactStatus
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse, ContactWithChats
from app.services import contact_service
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ContactResponse])
def list_contacts(
    status: Optional[ContactStatus] = Query(None),
    overdue_only: bool = Query(False),
    job_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return contact_service.get_contacts(db, current_user.id, status=status, overdue_only=overdue_only, job_id=job_id)


@router.post("/", response_model=ContactResponse, status_code=201)
def create_contact(contact_data: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return contact_service.create_contact(db, contact_data, current_user.id)


@router.get("/{contact_id}", response_model=ContactWithChats)
def get_contact(contact_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = contact_service.get_contact(db, contact_id, current_user.id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: UUID, contact_data: ContactUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = contact_service.update_contact(db, contact_id, contact_data, current_user.id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = contact_service.delete_contact(db, contact_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
