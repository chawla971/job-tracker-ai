from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.models.coffee_chat import CoffeeChat
from app.models.embedding import SourceType
from app.schemas.coffee_chat import CoffeeChatCreate, CoffeeChatUpdate
from app.rag.pipeline import embed_and_store
from app.rag.embed_helpers import embed_if_updated


def get_coffee_chats(db: Session, contact_id: UUID, user_id: UUID) -> List[CoffeeChat]:
    from app.models.contact import Contact
    # Join through Contact to ensure the contact belongs to this user.
    # Without this, any authenticated user could enumerate chats by guessing contact IDs.
    return (
        db.query(CoffeeChat)
        .join(Contact, CoffeeChat.contact_id == Contact.id)
        .filter(CoffeeChat.contact_id == contact_id, Contact.user_id == user_id)
        .order_by(CoffeeChat.date_time.desc())
        .all()
    )


def get_coffee_chat(db: Session, chat_id: UUID, user_id: UUID) -> Optional[CoffeeChat]:
    return db.query(CoffeeChat).filter(CoffeeChat.id == chat_id, CoffeeChat.user_id == user_id).first()


def create_coffee_chat(db: Session, chat_data: CoffeeChatCreate, user_id: UUID) -> CoffeeChat:
    chat = CoffeeChat(**chat_data.model_dump(), user_id=user_id)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    if chat.notes:
        embed_and_store(db, SourceType.coffee_chat_notes, chat.id, chat.notes, user_id=user_id)
    return chat


def update_coffee_chat(db: Session, chat_id: UUID, chat_data: CoffeeChatUpdate, user_id: UUID) -> Optional[CoffeeChat]:
    chat = get_coffee_chat(db, chat_id, user_id)
    if not chat:
        return None
    updates = chat_data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(chat, field, value)
    db.commit()
    db.refresh(chat)
    embed_if_updated(db, updates, "notes", SourceType.coffee_chat_notes, chat.id, chat.notes, user_id)
    return chat


def delete_coffee_chat(db: Session, chat_id: UUID, user_id: UUID) -> bool:
    chat = get_coffee_chat(db, chat_id, user_id)
    if not chat:
        return False
    db.delete(chat)
    db.commit()
    return True
