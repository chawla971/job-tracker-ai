from typing import List
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    # Full conversation history (not including the current message).
    # Capped at 15 messages on the client side before sending.
    history: List[ChatMessage] = []


class SourceChunk(BaseModel):
    source_type: str
    source_id: str
    chunk_text: str
    distance: float


class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceChunk]
