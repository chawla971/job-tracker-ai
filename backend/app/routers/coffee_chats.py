from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.coffee_chat import CoffeeChatCreate, CoffeeChatUpdate, CoffeeChatResponse
from app.services import coffee_chat_service
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=List[CoffeeChatResponse])
def list_coffee_chats(contact_id: UUID = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return coffee_chat_service.get_coffee_chats(db, contact_id, current_user.id)


@router.post("/", response_model=CoffeeChatResponse, status_code=201)
def create_coffee_chat(chat_data: CoffeeChatCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return coffee_chat_service.create_coffee_chat(db, chat_data, current_user.id)


@router.patch("/{chat_id}", response_model=CoffeeChatResponse)
def update_coffee_chat(chat_id: UUID, chat_data: CoffeeChatUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    chat = coffee_chat_service.update_coffee_chat(db, chat_id, chat_data, current_user.id)
    if not chat:
        raise HTTPException(status_code=404, detail="Coffee chat not found")
    return chat


@router.delete("/{chat_id}", status_code=204)
def delete_coffee_chat(chat_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = coffee_chat_service.delete_coffee_chat(db, chat_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Coffee chat not found")
