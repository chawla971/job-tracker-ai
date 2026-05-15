from abc import ABC, abstractmethod
from typing import List


class Message:
    def __init__(self, role: str, content: str):
        self.role = role  # "user" or "assistant"
        self.content = content


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system: str, messages: List[Message]) -> str:
        ...
